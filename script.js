class CosmicDriftGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.setupCanvas()

    // Game state
    this.gameState = "start" // 'start', 'playing', 'gameOver'
    this.score = 0
    this.level = 1
    this.crystalsCollected = 0
    this.startTime = 0

    // Player
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      fuel: 100,
      maxFuel: 100,
      size: 15,
      thrustPower: 0.3,
      maxSpeed: 8,
      friction: 0.98,
    }

    // Game objects
    this.asteroids = []
    this.crystals = []
    this.particles = []
    this.stars = []

    // Input
    this.keys = {}

    // Audio context for sound effects
    this.audioContext = null
    this.initAudio()

    this.init()
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight

    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
      this.player.x = this.canvas.width / 2
      this.player.y = this.canvas.height / 2
    })
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.log("Web Audio API not supported")
    }
  }

  playSound(frequency, duration, type = "sine") {
    if (!this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  init() {
    this.setupEventListeners()
    this.generateStars()
    this.resetGame()
    this.gameLoop()
  }

  setupEventListeners() {
    // Keyboard events
    document.addEventListener("keydown", (e) => {
      this.keys[e.code] = true
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume()
      }
    })

    document.addEventListener("keyup", (e) => {
      this.keys[e.code] = false
    })

    // Button events
    document.getElementById("startButton").addEventListener("click", () => {
      this.startGame()
    })

    document.getElementById("restartButton").addEventListener("click", () => {
      this.resetGame()
      this.startGame()
    })
  }

  generateStars() {
    this.stars = []
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 0.02 + 0.01,
      })
    }
  }

  resetGame() {
    this.score = 0
    this.level = 1
    this.crystalsCollected = 0
    this.startTime = Date.now()

    this.player.x = this.canvas.width / 2
    this.player.y = this.canvas.height / 2
    this.player.vx = 0
    this.player.vy = 0
    this.player.angle = 0
    this.player.fuel = this.player.maxFuel

    this.asteroids = []
    this.crystals = []
    this.particles = []

    this.generateInitialObjects()
  }

  generateInitialObjects() {
    // Generate asteroids
    for (let i = 0; i < 5 + this.level; i++) {
      this.createAsteroid()
    }

    // Generate crystals
    for (let i = 0; i < 3 + Math.floor(this.level / 2); i++) {
      this.createCrystal()
    }
  }

  createAsteroid() {
    const size = Math.random() * 30 + 20
    let x, y

    // Spawn away from player
    do {
      x = Math.random() * this.canvas.width
      y = Math.random() * this.canvas.height
    } while (this.distance(x, y, this.player.x, this.player.y) < 200)

    this.asteroids.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: size,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      vertices: this.generateAsteroidVertices(size),
    })
  }

  generateAsteroidVertices(size) {
    const vertices = []
    const numVertices = 8 + Math.floor(Math.random() * 4)

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2
      const radius = size * (0.8 + Math.random() * 0.4)
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      })
    }

    return vertices
  }

  createCrystal() {
    let x, y

    // Spawn away from player and asteroids
    let validPosition = false
    let attempts = 0

    while (!validPosition && attempts < 50) {
      x = Math.random() * this.canvas.width
      y = Math.random() * this.canvas.height

      validPosition = true

      // Check distance from player
      if (this.distance(x, y, this.player.x, this.player.y) < 150) {
        validPosition = false
      }

      // Check distance from asteroids
      for (const asteroid of this.asteroids) {
        if (this.distance(x, y, asteroid.x, asteroid.y) < asteroid.size + 50) {
          validPosition = false
          break
        }
      }

      attempts++
    }

    if (validPosition) {
      this.crystals.push({
        x: x,
        y: y,
        size: 12,
        rotation: 0,
        rotationSpeed: 0.05,
        pulse: 0,
        pulseSpeed: 0.1,
        collected: false,
      })
    }
  }

  startGame() {
    this.gameState = "playing"
    document.getElementById("startScreen").classList.add("hidden")
    document.getElementById("gameScreen").classList.remove("hidden")
    document.getElementById("gameOverScreen").classList.add("hidden")

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume()
    }
  }

  endGame() {
    this.gameState = "gameOver"
    document.getElementById("gameScreen").classList.add("hidden")
    document.getElementById("gameOverScreen").classList.remove("hidden")

    // Update final stats
    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalLevel").textContent = this.level
    document.getElementById("finalCrystals").textContent = this.crystalsCollected

    const timeElapsed = Math.floor((Date.now() - this.startTime) / 1000)
    document.getElementById("timeSurvived").textContent = timeElapsed + "s"

    this.playSound(200, 0.5, "sawtooth")
  }

  handleInput() {
    if (this.gameState !== "playing") return

    const thrust = this.keys["KeyW"] || this.keys["ArrowUp"]
    const left = this.keys["KeyA"] || this.keys["ArrowLeft"]
    const right = this.keys["KeyD"] || this.keys["ArrowRight"]
    const reverse = this.keys["KeyS"] || this.keys["ArrowDown"]
    const boost = this.keys["Space"]

    // Rotation
    if (left) this.player.angle -= 0.1
    if (right) this.player.angle += 0.1

    // Thrust
    if ((thrust || reverse) && this.player.fuel > 0) {
      const thrustMultiplier = boost && this.player.fuel > 5 ? 2 : 1
      const direction = reverse ? -1 : 1
      const power = this.player.thrustPower * thrustMultiplier * direction

      this.player.vx += Math.cos(this.player.angle) * power
      this.player.vy += Math.sin(this.player.angle) * power

      this.player.fuel -= thrustMultiplier * 0.5

      // Create thrust particles
      this.createThrustParticles()
    }

    // Apply friction and speed limit
    this.player.vx *= this.player.friction
    this.player.vy *= this.player.friction

    const speed = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2)
    if (speed > this.player.maxSpeed) {
      this.player.vx = (this.player.vx / speed) * this.player.maxSpeed
      this.player.vy = (this.player.vy / speed) * this.player.maxSpeed
    }
  }

  createThrustParticles() {
    for (let i = 0; i < 3; i++) {
      const angle = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.5
      const speed = Math.random() * 3 + 2

      this.particles.push({
        x: this.player.x - Math.cos(this.player.angle) * this.player.size,
        y: this.player.y - Math.sin(this.player.angle) * this.player.size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.05,
        size: Math.random() * 3 + 1,
        color: `hsl(${Math.random() * 60 + 15}, 100%, 70%)`,
      })
    }
  }

  update() {
    if (this.gameState !== "playing") return

    this.handleInput()

    // Update player position
    this.player.x += this.player.vx
    this.player.y += this.player.vy

    // Wrap around screen
    if (this.player.x < 0) this.player.x = this.canvas.width
    if (this.player.x > this.canvas.width) this.player.x = 0
    if (this.player.y < 0) this.player.y = this.canvas.height
    if (this.player.y > this.canvas.height) this.player.y = 0

    // Regenerate fuel slowly
    if (this.player.fuel < this.player.maxFuel) {
      this.player.fuel += 0.1
    }

    // Update asteroids
    this.asteroids.forEach((asteroid) => {
      asteroid.x += asteroid.vx
      asteroid.y += asteroid.vy
      asteroid.rotation += asteroid.rotationSpeed

      // Wrap around screen
      if (asteroid.x < -asteroid.size) asteroid.x = this.canvas.width + asteroid.size
      if (asteroid.x > this.canvas.width + asteroid.size) asteroid.x = -asteroid.size
      if (asteroid.y < -asteroid.size) asteroid.y = this.canvas.height + asteroid.size
      if (asteroid.y > this.canvas.height + asteroid.size) asteroid.y = -asteroid.size
    })

    // Update crystals
    this.crystals.forEach((crystal) => {
      crystal.rotation += crystal.rotationSpeed
      crystal.pulse += crystal.pulseSpeed
    })

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life -= particle.decay
      particle.vx *= 0.98
      particle.vy *= 0.98
      return particle.life > 0
    })

    // Update stars
    this.stars.forEach((star) => {
      star.brightness += star.twinkle * (Math.random() - 0.5)
      star.brightness = Math.max(0.1, Math.min(1, star.brightness))
    })

    // Check collisions
    this.checkCollisions()

    // Spawn new objects
    this.spawnObjects()

    // Update level
    this.updateLevel()

    // Check game over conditions
    if (this.player.fuel <= 0) {
      this.endGame()
    }

    // Update HUD
    this.updateHUD()
  }

  checkCollisions() {
    // Player vs Asteroids
    for (const asteroid of this.asteroids) {
      if (
        this.distance(this.player.x, this.player.y, asteroid.x, asteroid.y) <
        this.player.size + asteroid.size * 0.8
      ) {
        this.player.fuel -= 10
        this.playSound(150, 0.3, "sawtooth")

        // Push player away
        const angle = Math.atan2(this.player.y - asteroid.y, this.player.x - asteroid.x)
        this.player.vx += Math.cos(angle) * 3
        this.player.vy += Math.sin(angle) * 3

        // Create impact particles
        this.createImpactParticles(this.player.x, this.player.y)
      }
    }

    // Player vs Crystals
    this.crystals = this.crystals.filter((crystal) => {
      if (this.distance(this.player.x, this.player.y, crystal.x, crystal.y) < this.player.size + crystal.size) {
        this.crystalsCollected++
        this.score += 100 * this.level
        this.player.fuel = Math.min(this.player.maxFuel, this.player.fuel + 20)
        this.playSound(800, 0.2, "sine")

        // Create collection particles
        this.createCollectionParticles(crystal.x, crystal.y)

        return false
      }
      return true
    })
  }

  createImpactParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = Math.random() * 4 + 2

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.03,
        size: Math.random() * 4 + 2,
        color: `hsl(0, 100%, ${Math.random() * 50 + 50}%)`,
      })
    }
  }

  createCollectionParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const speed = Math.random() * 3 + 1

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02,
        size: Math.random() * 3 + 1,
        color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`,
      })
    }
  }

  spawnObjects() {
    // Spawn asteroids
    if (this.asteroids.length < 3 + this.level && Math.random() < 0.01) {
      this.createAsteroid()
    }

    // Spawn crystals
    if (this.crystals.length < 2 + Math.floor(this.level / 2) && Math.random() < 0.005) {
      this.createCrystal()
    }
  }

  updateLevel() {
    const newLevel = Math.floor(this.score / 1000) + 1
    if (newLevel > this.level) {
      this.level = newLevel
      this.playSound(600, 0.5, "triangle")
    }
  }

  updateHUD() {
    document.getElementById("score").textContent = this.score
    document.getElementById("level").textContent = this.level
    document.getElementById("crystals").textContent = this.crystalsCollected

    const fuelPercentage = (this.player.fuel / this.player.maxFuel) * 100
    document.getElementById("fuelLevel").style.width = fuelPercentage + "%"

    // Add warning class for low fuel
    const fuelBar = document.querySelector(".fuel-bar")
    if (fuelPercentage < 25) {
      fuelBar.classList.add("pulse")
    } else {
      fuelBar.classList.remove("pulse")
    }
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "rgba(12, 12, 12, 0.1)"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw stars
    this.drawStars()

    if (this.gameState === "playing") {
      // Draw particles
      this.drawParticles()

      // Draw asteroids
      this.drawAsteroids()

      // Draw crystals
      this.drawCrystals()

      // Draw player
      this.drawPlayer()
    }
  }

  drawStars() {
    this.ctx.save()
    this.stars.forEach((star) => {
      this.ctx.globalAlpha = star.brightness
      this.ctx.fillStyle = "#ffffff"
      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      this.ctx.fill()
    })
    this.ctx.restore()
  }

  drawPlayer() {
    this.ctx.save()
    this.ctx.translate(this.player.x, this.player.y)
    this.ctx.rotate(this.player.angle)

    // Ship body
    this.ctx.fillStyle = "#00d4ff"
    this.ctx.strokeStyle = "#ffffff"
    this.ctx.lineWidth = 2

    this.ctx.beginPath()
    this.ctx.moveTo(this.player.size, 0)
    this.ctx.lineTo(-this.player.size * 0.7, -this.player.size * 0.5)
    this.ctx.lineTo(-this.player.size * 0.3, 0)
    this.ctx.lineTo(-this.player.size * 0.7, this.player.size * 0.5)
    this.ctx.closePath()
    this.ctx.fill()
    this.ctx.stroke()

    // Engine glow
    if (this.keys["KeyW"] || this.keys["ArrowUp"] || this.keys["KeyS"] || this.keys["ArrowDown"]) {
      this.ctx.fillStyle = "#ff6600"
      this.ctx.beginPath()
      this.ctx.arc(-this.player.size * 0.5, 0, 3, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.restore()
  }

  drawAsteroids() {
    this.asteroids.forEach((asteroid) => {
      this.ctx.save()
      this.ctx.translate(asteroid.x, asteroid.y)
      this.ctx.rotate(asteroid.rotation)

      this.ctx.fillStyle = "#666666"
      this.ctx.strokeStyle = "#999999"
      this.ctx.lineWidth = 1

      this.ctx.beginPath()
      asteroid.vertices.forEach((vertex, index) => {
        if (index === 0) {
          this.ctx.moveTo(vertex.x, vertex.y)
        } else {
          this.ctx.lineTo(vertex.x, vertex.y)
        }
      })
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()

      this.ctx.restore()
    })
  }

  drawCrystals() {
    this.crystals.forEach((crystal) => {
      this.ctx.save()
      this.ctx.translate(crystal.x, crystal.y)
      this.ctx.rotate(crystal.rotation)

      const pulseSize = crystal.size + Math.sin(crystal.pulse) * 3

      // Outer glow
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize * 2)
      gradient.addColorStop(0, "rgba(0, 255, 255, 0.3)")
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)")
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, pulseSize * 2, 0, Math.PI * 2)
      this.ctx.fill()

      // Crystal body
      this.ctx.fillStyle = "#00ffff"
      this.ctx.strokeStyle = "#ffffff"
      this.ctx.lineWidth = 2

      this.ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const x = Math.cos(angle) * pulseSize
        const y = Math.sin(angle) * pulseSize

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.closePath()
      this.ctx.fill()
      this.ctx.stroke()

      this.ctx.restore()
    })
  }

  drawParticles() {
    this.particles.forEach((particle) => {
      this.ctx.save()
      this.ctx.globalAlpha = particle.life
      this.ctx.fillStyle = particle.color
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.restore()
    })
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  gameLoop() {
    this.update()
    this.render()
    requestAnimationFrame(() => this.gameLoop())
  }
}

// Initialize game when page loads
window.addEventListener("load", () => {
  new CosmicDriftGame()
})
