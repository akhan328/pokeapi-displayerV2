import { useRef, useState } from 'react'
import qUnown from './assets/qUnown.png'
import './App.css'

const API_URL = 'https://pokeapi.co/api/v2/pokemon/'

const TYPE_COLORS = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
}

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const SPRITE_LABELS = [
  ['front_default', 'Front'],
  ['back_default', 'Back'],
  ['front_shiny', 'Shiny'],
  ['back_shiny', 'Shiny Back'],
  ['front_female', 'Female'],
  ['back_female', 'Female Back'],
  ['front_shiny_female', 'Shiny Female'],
  ['back_shiny_female', 'Shiny Female Back'],
]

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function spaceCase(text) {
  return text.replace(/-/g, ' ')
}

function formatEvolutionCondition(details) {
  if (!details) return null
  const parts = []
  if (details.min_level) parts.push(`Level ${details.min_level}`)
  if (details.item) parts.push(`Use ${capitalize(spaceCase(details.item.name))}`)
  if (details.held_item) parts.push(`Hold ${capitalize(spaceCase(details.held_item.name))}`)
  if (details.min_happiness) parts.push(`Happiness ${details.min_happiness}+`)
  if (details.min_beauty) parts.push(`Beauty ${details.min_beauty}+`)
  if (details.time_of_day) parts.push(capitalize(details.time_of_day))
  if (details.known_move) parts.push(`Know ${capitalize(spaceCase(details.known_move.name))}`)
  if (details.trigger && details.trigger.name === 'trade') parts.push('Trade')
  if (details.trigger && details.trigger.name === 'shed') parts.push('Has empty slot')
  if (parts.length === 0 && details.trigger) {
    parts.push(capitalize(spaceCase(details.trigger.name)))
  }
  return parts.join(', ')
}

async function getEvolutionStages(evolutionChainUrl) {
  const response = await fetch(evolutionChainUrl)
  const data = await response.json()

  const stages = []
  let currentNodes = [{ node: data.chain, condition: null }]

  while (currentNodes.length > 0) {
    stages.push(
      currentNodes.map(({ node, condition }) => ({
        name: node.species.name,
        condition,
      }))
    )
    const nextNodes = []
    currentNodes.forEach(({ node }) => {
      node.evolves_to.forEach((child) => {
        nextNodes.push({
          node: child,
          condition: formatEvolutionCondition(child.evolution_details[0]),
        })
      })
    })
    currentNodes = nextNodes
  }

  const uniqueNames = [...new Set(stages.flat().map((s) => s.name))]
  const sprites = {}
  await Promise.all(
    uniqueNames.map(async (name) => {
      try {
        const res = await fetch(API_URL + name)
        const pokeData = await res.json()
        sprites[name] =
          pokeData.sprites.other?.['official-artwork']?.front_default ??
          pokeData.sprites.front_default
      } catch {
        sprites[name] = null
      }
    })
  )

  return stages.map((stage) =>
    stage.map((entry) => ({ ...entry, sprite: sprites[entry.name] }))
  )
}

function App() {
  const searchBox = useRef(null)

  const [pokemon, setPokemon] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function getPokemon(name) {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(API_URL + name)
      if (!response.ok) {
        throw new Error(`Couldn't find a Pokemon named "${name}"`)
      }
      const data = await response.json()

      const speciesResponse = await fetch(data.species.url)
      const speciesData = await speciesResponse.json()

      const flavorEntry = speciesData.flavor_text_entries.find(
        (entry) => entry.language.name === 'en'
      )
      const genusEntry = speciesData.genera.find(
        (entry) => entry.language.name === 'en'
      )

      const evolutionStages = await getEvolutionStages(
        speciesData.evolution_chain.url
      )

      const sprites = SPRITE_LABELS.map(([key, label]) => ({
        key,
        label,
        src: data.sprites[key],
      })).filter((s) => s.src)

      if (data.sprites.other?.dream_world?.front_default) {
        sprites.push({
          key: 'dream_world',
          label: 'Dream World',
          src: data.sprites.other.dream_world.front_default,
        })
      }
      if (data.sprites.other?.home?.front_default) {
        sprites.push({
          key: 'home',
          label: 'Home',
          src: data.sprites.other.home.front_default,
        })
      }

      setPokemon({
        id: data.id,
        name: data.name,
        order: data.order,
        genus: genusEntry ? genusEntry.genus : '',
        image:
          data.sprites.other?.['official-artwork']?.front_default ??
          data.sprites.front_default,
        types: data.types.map((t) => t.type.name),
        stats: data.stats.map((s) => ({
          name: s.stat.name,
          value: s.base_stat,
          effort: s.effort,
        })),
        height: data.height / 10,
        weight: data.weight / 10,
        baseExperience: data.base_experience,
        abilities: data.abilities.map((a) => ({
          name: spaceCase(a.ability.name),
          hidden: a.is_hidden,
        })),
        description: flavorEntry
          ? flavorEntry.flavor_text.replace(/[\n\f]/g, ' ')
          : '',
        captureRate: speciesData.capture_rate,
        baseHappiness: speciesData.base_happiness,
        growthRate: capitalize(spaceCase(speciesData.growth_rate.name)),
        habitat: speciesData.habitat
          ? capitalize(spaceCase(speciesData.habitat.name))
          : 'Unknown',
        shape: speciesData.shape
          ? capitalize(spaceCase(speciesData.shape.name))
          : 'Unknown',
        color: capitalize(speciesData.color.name),
        generation: capitalize(spaceCase(speciesData.generation.name)),
        eggGroups: speciesData.egg_groups.map((g) => capitalize(g.name)),
        hatchCounter: speciesData.hatch_counter,
        genderRate: speciesData.gender_rate,
        isLegendary: speciesData.is_legendary,
        isMythical: speciesData.is_mythical,
        isBaby: speciesData.is_baby,
        heldItems: data.held_items.map((h) => capitalize(spaceCase(h.item.name))),
        varieties: speciesData.varieties
          .filter((v) => !v.is_default)
          .map((v) => capitalize(spaceCase(v.pokemon.name))),
        moves: [...new Set(data.moves.map((m) => capitalize(spaceCase(m.move.name))))].sort(),
        cries: data.cries,
        sprites,
        evolutionStages,
      })
    } catch (err) {
      setPokemon(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch() {
    const pokemonName = searchBox.current.value.trim().toLowerCase()
    if (pokemonName) {
      getPokemon(pokemonName)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  function handleClear() {
    setPokemon(null)
    setError(null)
    if (searchBox.current) {
      searchBox.current.value = ''
      searchBox.current.focus()
    }
  }

  function genderLabel(rate) {
    if (rate === -1) return 'Genderless'
    const female = (rate / 8) * 100
    const male = 100 - female
    return `${male}% Male / ${female}% Female`
  }

  return (
    <>
      <div className="card">
        <div className="card-lights">
          <span className="card-light card-light--main" />
          <span className="card-light card-light--red" />
          <span className="card-light card-light--yellow" />
          <span className="card-light card-light--green" />
        </div>
        <div className="screen">
        <div className="search">
          <input
            type="text"
            className="search-input"
            placeholder="Enter Pokemon Name"
            ref={searchBox}
            onKeyDown={handleKeyDown}
          />
          <button className="search-button" onClick={handleSearch}>
            Search
          </button>
          {(pokemon || error) && (
            <button
              className="clear-button"
              onClick={handleClear}
              aria-label="Clear search"
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {loading && <p className="status-message">Loading...</p>}
        {error && <p className="status-message error">{error}</p>}

        {!loading && !error && !pokemon && (
          <div className="empty-state">
            <img src={qUnown} className="empty-image" alt="" />
            <p>Search for a Pokemon to see its details</p>
          </div>
        )}

        {!loading && pokemon && (
          <div className="pokemon-details">
            <div className="pokemon-header">
              <h1 className="pokemon-name">{capitalize(pokemon.name)}</h1>
              <span className="pokemon-id">
                #{String(pokemon.id).padStart(3, '0')}
              </span>
            </div>
            {pokemon.genus && <p className="pokemon-genus">{pokemon.genus}</p>}

            <div className="flag-list">
              {pokemon.isLegendary && <span className="flag-badge legendary">Legendary</span>}
              {pokemon.isMythical && <span className="flag-badge mythical">Mythical</span>}
              {pokemon.isBaby && <span className="flag-badge baby">Baby</span>}
            </div>

            <img src={pokemon.image} className="pokemon-image" alt={pokemon.name} />

            <div className="type-list">
              {pokemon.types.map((type) => (
                <span
                  key={type}
                  className="type-badge"
                  style={{ background: TYPE_COLORS[type] ?? '#777' }}
                >
                  {capitalize(type)}
                </span>
              ))}
            </div>

            {pokemon.description && (
              <p className="pokemon-description">{pokemon.description}</p>
            )}

            {(pokemon.cries.latest || pokemon.cries.legacy) && (
              <div className="cries">
                {pokemon.cries.latest && (
                  <div className="cry-item">
                    <span>Cry</span>
                    <audio controls src={pokemon.cries.latest} />
                  </div>
                )}
                {pokemon.cries.legacy && (
                  <div className="cry-item">
                    <span>Legacy Cry</span>
                    <audio controls src={pokemon.cries.legacy} />
                  </div>
                )}
              </div>
            )}

            <div className="main-grid">
              <div className="panel">
                <h2 className="section-title">Info</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Height</span>
                    <span className="info-value">{pokemon.height} m</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Weight</span>
                    <span className="info-value">{pokemon.weight} kg</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Base Exp.</span>
                    <span className="info-value">{pokemon.baseExperience}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Capture Rate</span>
                    <span className="info-value">{pokemon.captureRate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Base Happiness</span>
                    <span className="info-value">{pokemon.baseHappiness}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Growth Rate</span>
                    <span className="info-value">{pokemon.growthRate}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Habitat</span>
                    <span className="info-value">{pokemon.habitat}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Shape</span>
                    <span className="info-value">{pokemon.shape}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Color</span>
                    <span className="info-value">{pokemon.color}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Generation</span>
                    <span className="info-value">{pokemon.generation}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Egg Groups</span>
                    <span className="info-value">{pokemon.eggGroups.join(', ')}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Hatch Counter</span>
                    <span className="info-value">{pokemon.hatchCounter}</span>
                  </div>
                  <div className="info-item wide">
                    <span className="info-label">Gender Ratio</span>
                    <span className="info-value">{genderLabel(pokemon.genderRate)}</span>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h2 className="section-title">Stats</h2>
                <div className="statistics">
                  {pokemon.stats.map((stat) => (
                    <div className="stat-row" key={stat.name}>
                      <span className="stat-label">
                        {STAT_LABELS[stat.name] ?? stat.name}
                      </span>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${Math.min(stat.value / 1.8, 100)}%` }}
                        />
                      </div>
                      <span className="stat-value">{stat.value}</span>
                    </div>
                  ))}
                  <div className="stat-row total">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">
                      {pokemon.stats.reduce((sum, s) => sum + s.value, 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="panel">
                <h2 className="section-title">Abilities</h2>
                <div className="ability-list">
                  {pokemon.abilities.map((ability) => (
                    <span key={ability.name} className="ability-badge">
                      {capitalize(ability.name)}
                      {ability.hidden && ' (Hidden)'}
                    </span>
                  ))}
                </div>

                {pokemon.heldItems.length > 0 && (
                  <>
                    <h2 className="section-title">Held Items</h2>
                    <div className="ability-list">
                      {pokemon.heldItems.map((item) => (
                        <span key={item} className="ability-badge item">
                          {item}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {pokemon.varieties.length > 0 && (
                  <>
                    <h2 className="section-title">Other Forms</h2>
                    <div className="ability-list">
                      {pokemon.varieties.map((v) => (
                        <span key={v} className="ability-badge variety">
                          {v}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {pokemon.evolutionStages.length > 1 && (
                <div className="panel wide">
                  <h2 className="section-title">Evolution Chain</h2>
                  <div className="evolution-chain">
                    {pokemon.evolutionStages.map((stage, i) => (
                      <div className="evolution-stage-wrapper" key={i}>
                        {i > 0 && <span className="evolution-arrow">&rarr;</span>}
                        <div className="evolution-stage">
                          {stage.map((entry) => (
                            <div className="evolution-entry" key={entry.name}>
                              {entry.sprite && (
                                <img src={entry.sprite} alt={entry.name} />
                              )}
                              <span className="evolution-name">
                                {capitalize(entry.name)}
                              </span>
                              {entry.condition && (
                                <span className="evolution-condition">
                                  {entry.condition}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="panel wide">
                <h2 className="section-title">Sprites</h2>
                <div className="sprite-gallery">
                  {pokemon.sprites.map((sprite) => (
                    <div className="sprite-item" key={sprite.key}>
                      <img src={sprite.src} alt={sprite.label} />
                      <span>{sprite.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel wide">
                <h2 className="section-title">
                  Moves ({pokemon.moves.length})
                </h2>
                <div className="move-list">
                  {pokemon.moves.map((move) => (
                    <span key={move} className="move-badge">
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="attribution">
        <p>
          Background designed by{' '}
          <a href="https://www.freepik.com/free-vector/gradient-zoom-effect-blue-background_32841000.htm#query=pokemon%20background&position=1&from_view=keyword&track=ais_hybrid&uuid=875b730b-d1a0-4b8b-9da2-b2e8dc0768f9">
            Freepix
          </a>
        </p>
      </div>
    </>
  )
}

export default App
