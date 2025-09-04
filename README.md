# Apex Strafe Control Timer

A web application designed to help Apex Legends players master strafe recoil control through audio cues and beat matching. Practice weapon-specific patterns in the firing range with perfect timing.

## Features

- **Weapon Selection**: Choose from popular Apex Legends weapons
- **Audio Cues**: Different tones for left (A) and right (D) movements
- **Startup Beats**: Audio cues to time your magazine start
- **Pattern Visualization**: Real-time display of current movement direction
- **Progress Tracking**: Visual progress bar and timing information
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

1. **Startup Phase**: Listen to the startup beats to time when to start your magazine
2. **Pattern Execution**: Follow the audio cues to move left (A) and right (D) in sequence
3. **Beat Matching**: Each weapon has unique timing patterns optimized for recoil control
4. **Practice Loop**: Patterns repeat automatically for continuous practice

## Supported Weapons

- **R-301 Carbine**: Fast, alternating pattern with 3 startup beats
- **VK-47 Flatline**: Medium-paced pattern with 4 startup beats  
- **HAVOC Rifle**: Balanced pattern with 3 startup beats
- **Spitfire**: Slower, deliberate pattern with 2 startup beats

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd apex-strafe-control-timer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Technical Details

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Audio**: Web Audio API for tone generation
- **Deployment**: Static export ready for cost-effective hosting

## Usage Tips

- **Practice in Firing Range**: Use this tool while practicing in Apex Legends firing range
- **Headphones Recommended**: Audio cues are essential for timing
- **Start Slow**: Begin with weapons that have fewer pattern steps
- **Consistent Practice**: Regular practice will build muscle memory

## Contributing

This is a fun, open-source project. Feel free to contribute by:
- Adding new weapons and patterns
- Improving the audio system
- Enhancing the UI/UX
- Reporting bugs or suggesting features

## License

This project is open source and available under the MIT License.

## Disclaimer

This tool is for educational and practice purposes only. It is not affiliated with Electronic Arts or Respawn Entertainment.
