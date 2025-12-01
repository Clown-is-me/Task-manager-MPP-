// particles.js - Анимация частиц с космонавтами (вид сверху + плавные перевороты)
class ParticleNetwork {
    constructor() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) {
            console.log('Canvas element not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.astronauts = [];
        this.mouse = { x: 0, y: 0, radius: 120 };
        
        console.log('Initializing Particle Network with rotating astronauts...');
        this.init();
        this.animate();
        this.setupEventListeners();
    }

    init() {
        this.resize();
        this.createParticles();
        this.createAstronauts();
        console.log('Particle network initialized with', this.particles.length, 'particles and', this.astronauts.length, 'astronauts');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        this.particles = [];
        const particleCount = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 20000));

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                color: this.getRandomColor()
            });
        }
    }

    createAstronauts() {
        this.astronauts = [];
        
        // Первый космонавт - появляется слева, летит вправо
        this.astronauts.push({
            x: -100,
            y: Math.random() * this.canvas.height * 0.6 + 100,
            size: 50,
            speedX: 0.8,
            speedY: 0,
            state: 'waiting',
            timer: Math.random() * 300 + 100,
            waveTimer: 0,
            rotation: 0,
            targetRotation: 0,
            isRotating: false,
            rotationProgress: 0,
            rotationDuration: 0,
            floatOffset: 0,
            floatPhase: Math.random() * Math.PI * 2,
            color: '#4f46e5',
            helmetColor: '#60a5fa',
            suitColor: '#3730a3'
        });

        // Второй космонавт - появляется справа, летит влево
        this.astronauts.push({
            x: this.canvas.width + 100,
            y: Math.random() * this.canvas.height * 0.6 + 100,
            size: 45,
            speedX: -0.6,
            speedY: 0.1,
            state: 'waiting',
            timer: Math.random() * 400 + 200,
            waveTimer: 0,
            rotation: 0,
            targetRotation: 0,
            isRotating: false,
            rotationProgress: 0,
            rotationDuration: 0,
            floatOffset: 0,
            floatPhase: Math.random() * Math.PI * 2,
            color: '#a78bfa',
            helmetColor: '#34d399',
            suitColor: '#7c3aed'
        });
    }

    getRandomColor() {
        const colors = [
            'rgba(79, 70, 229, 0.8)',
            'rgba(167, 139, 250, 0.7)',
            'rgba(96, 165, 250, 0.7)',
            'rgba(52, 211, 153, 0.7)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем тёмный градиентный фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1e1e2e');
        gradient.addColorStop(1, '#2a2a3b');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateParticles();
        this.updateAstronauts();
        this.drawConnections();
        this.drawParticles();
        this.drawAstronauts();
        
        requestAnimationFrame(() => this.animate());
    }

    updateParticles() {
        this.particles.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            if (particle.x < 0 || particle.x > this.canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.speedY *= -1;

            const dx = particle.x - this.mouse.x;
            const dy = particle.y - this.mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.mouse.radius) {
                const force = (this.mouse.radius - distance) / this.mouse.radius;
                particle.x += (dx / distance) * force * 3;
                particle.y += (dy / distance) * force * 3;
            }
        });
    }

    updateAstronauts() {
        const time = Date.now() * 0.001;
        
        this.astronauts.forEach(astronaut => {
            // Плавное плавание в невесомости
            astronaut.floatOffset = Math.sin(time + astronaut.floatPhase) * 3;
            
            if (astronaut.state === 'waiting') {
                astronaut.timer--;
                if (astronaut.timer <= 0) {
                    astronaut.state = 'flying';
                }
                return;
            }

            if (astronaut.state === 'flying') {
                astronaut.x += astronaut.speedX;
                astronaut.y += astronaut.speedY + astronaut.floatOffset * 0.1;

                // Случайное изменение траектории (плавное)
                if (Math.random() < 0.01) {
                    astronaut.speedY += (Math.random() - 0.5) * 0.1;
                }

                // Ограничение по вертикали
                if (astronaut.y < 50) astronaut.y = 50;
                if (astronaut.y > this.canvas.height - 100) astronaut.y = this.canvas.height - 100;

                // Случайное махание рукой
                if (Math.random() < 0.005 && astronaut.waveTimer === 0) {
                    astronaut.waveTimer = 90;
                }

                // Случайный переворот (от 45 до 360 градусов)
                if (Math.random() < 0.002 && !astronaut.isRotating) {
                    this.startRotation(astronaut);
                }

                // Обновление анимации переворота
                if (astronaut.isRotating) {
                    astronaut.rotationProgress += 1 / astronaut.rotationDuration;
                    
                    if (astronaut.rotationProgress >= 1) {
                        // Завершение переворота
                        astronaut.rotation = astronaut.targetRotation;
                        astronaut.isRotating = false;
                        astronaut.rotationProgress = 0;
                    } else {
                        // Плавная интерполяция с ease-out
                        const progress = this.easeOutCubic(astronaut.rotationProgress);
                        const delta = astronaut.targetRotation - astronaut.startRotation;
                        astronaut.rotation = astronaut.startRotation + (delta * progress);
                        
                        // Нормализация угла
                        while (astronaut.rotation > Math.PI * 2) astronaut.rotation -= Math.PI * 2;
                        while (astronaut.rotation < 0) astronaut.rotation += Math.PI * 2;
                    }
                }

                // Проверка выхода за границы
                if ((astronaut.speedX > 0 && astronaut.x > this.canvas.width + 100) ||
                    (astronaut.speedX < 0 && astronaut.x < -100)) {
                    this.resetAstronaut(astronaut);
                }
            }

            // Обновление таймера махания
            if (astronaut.waveTimer > 0) {
                astronaut.waveTimer--;
            }
        });
    }

    startRotation(astronaut) {
        astronaut.isRotating = true;
        astronaut.rotationProgress = 0;
        astronaut.startRotation = astronaut.rotation;
        
        // Случайный угол от 45 до 360 градусов
        const randomDegrees = 45 + Math.random() * 315; // 45-360 градусов
        const randomRadians = randomDegrees * (Math.PI / 180);
        
        astronaut.targetRotation = astronaut.rotation + randomRadians;
        
        // Длительность анимации зависит от угла (чем больше угол - тем дольше)
        astronaut.rotationDuration = 120 + (randomDegrees / 360) * 180; // 2-5 секунд
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    resetAstronaut(astronaut) {
        if (astronaut.speedX > 0) {
            astronaut.x = -100;
            astronaut.y = Math.random() * this.canvas.height * 0.6 + 100;
        } else {
            astronaut.x = this.canvas.width + 100;
            astronaut.y = Math.random() * this.canvas.height * 0.6 + 100;
        }
        astronaut.state = 'waiting';
        astronaut.timer = Math.random() * 600 + 300;
        astronaut.waveTimer = 0;
        astronaut.isRotating = false;
        astronaut.rotationProgress = 0;
        astronaut.floatPhase = Math.random() * Math.PI * 2;
    }

    drawParticles() {
        this.particles.forEach(particle => {
            const glow = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size * 4
            );
            glow.addColorStop(0, particle.color.replace('0.7', '0.4').replace('0.8', '0.4'));
            glow.addColorStop(1, 'transparent');
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
            this.ctx.fillStyle = glow;
            this.ctx.fill();

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        });
    }

    drawAstronauts() {
        this.astronauts.forEach(astronaut => {
            if (astronaut.state === 'waiting') return;

            this.ctx.save();
            this.ctx.translate(astronaut.x, astronaut.y + astronaut.floatOffset);
            
            // Применяем вращение
            this.ctx.rotate(astronaut.rotation);

            // Тело космонавта (овальное) - ВИД СВЕРХУ
            this.ctx.fillStyle = astronaut.color;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, astronaut.size/2, astronaut.size/2.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Шлем (круглый)
            this.ctx.fillStyle = astronaut.helmetColor;
            this.ctx.beginPath();
            this.ctx.arc(0, -astronaut.size/3, astronaut.size/3, 0, Math.PI * 2);
            this.ctx.fill();

            // Стекло шлема с бликом
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(-astronaut.size/8, -astronaut.size/3 - astronaut.size/12, astronaut.size/8, 0, Math.PI * 2);
            this.ctx.fill();

            // Основное стекло шлема
            this.ctx.fillStyle = 'rgba(96, 165, 250, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(0, -astronaut.size/3, astronaut.size/3.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Ноги (изогнутые)
            this.ctx.fillStyle = astronaut.suitColor;
            this.drawLeg(astronaut, -astronaut.size/4, astronaut.size/3);
            this.drawLeg(astronaut, astronaut.size/4, astronaut.size/3);

            // Руки (плавные с анимацией махания)
            this.drawArm(astronaut, -astronaut.size/2, 'left');
            this.drawArm(astronaut, astronaut.size/2, 'right');

            // Ракетный ранец (овальный)
            this.ctx.fillStyle = '#374151';
            this.ctx.beginPath();
            this.ctx.ellipse(0, astronaut.size/4, astronaut.size/3, astronaut.size/6, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Огонь из ранца (с анимацией)
            this.drawThruster(astronaut);

            this.ctx.restore();

            // Свечение вокруг космонавта
            this.drawAstronautGlow(astronaut);
        });
    }

    drawLeg(astronaut, x, y) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        this.ctx.fillStyle = astronaut.suitColor;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, astronaut.size/8, astronaut.size/4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ботинок
        this.ctx.fillStyle = '#1f2937';
        this.ctx.beginPath();
        this.ctx.ellipse(0, astronaut.size/3, astronaut.size/6, astronaut.size/8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawArm(astronaut, startX, side) {
        this.ctx.save();
        this.ctx.translate(startX, -astronaut.size/6);
        
        let waveAngle = 0;
        if (astronaut.waveTimer > 0) {
            // Плавная анимация махания
            const progress = 1 - (astronaut.waveTimer / 90);
            waveAngle = Math.sin(progress * Math.PI * 4) * 0.8;
            
            if (side === 'left') {
                waveAngle *= -1;
            }
        }
        
        this.ctx.rotate(waveAngle);
        
        // Рука
        this.ctx.fillStyle = astronaut.suitColor;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, astronaut.size/6, astronaut.size/4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Перчатка
        this.ctx.fillStyle = '#1f2937';
        this.ctx.beginPath();
        if (side === 'left') {
            this.ctx.ellipse(-astronaut.size/4, 0, astronaut.size/5, astronaut.size/6, 0, 0, Math.PI * 2);
        } else {
            this.ctx.ellipse(astronaut.size/4, 0, astronaut.size/5, astronaut.size/6, 0, 0, Math.PI * 2);
        }
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawThruster(astronaut) {
        if (Math.random() < 0.5) {
            const flameSize = astronaut.size/3 * (0.5 + Math.random() * 0.5);
            
            const flame = this.ctx.createLinearGradient(
                0, astronaut.size/2, 
                0, astronaut.size/2 + flameSize
            );
            flame.addColorStop(0, '#f59e0b');
            flame.addColorStop(0.3, '#ef4444');
            flame.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = flame;
            this.ctx.beginPath();
            this.ctx.ellipse(0, astronaut.size/2 + flameSize/2, astronaut.size/6, flameSize/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawAstronautGlow(astronaut) {
        const glow = this.ctx.createRadialGradient(
            astronaut.x, astronaut.y + astronaut.floatOffset, 0,
            astronaut.x, astronaut.y + astronaut.floatOffset, astronaut.size * 2.5
        );
        glow.addColorStop(0, astronaut.color.replace('0.7', '0.15').replace('0.8', '0.15'));
        glow.addColorStop(1, 'transparent');
        
        this.ctx.beginPath();
        this.ctx.arc(astronaut.x, astronaut.y + astronaut.floatOffset, astronaut.size * 2.5, 0, Math.PI * 2);
        this.ctx.fillStyle = glow;
        this.ctx.fill();
    }

    drawConnections() {
        const maxDistance = 150;
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    const opacity = 1 - (distance / maxDistance);
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(79, 70, 229, ${opacity * 0.2})`;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
            this.createAstronauts();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = 0;
            this.mouse.y = 0;
        });
    }
}

// Инициализация
window.addEventListener('load', function() {
    console.log('Page loaded, initializing particles with rotating astronauts...');
    setTimeout(() => {
        new ParticleNetwork();
    }, 100);
});

if (document.readyState === 'complete') {
    setTimeout(() => {
        new ParticleNetwork();
    }, 100);
}