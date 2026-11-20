# Tiny World: Dewdrop

**Tiny World: Dewdrop** is a mobile-first 2D macro-scale platformer created for **Game Jam 2026** (Theme: **TINY WORLD**).  
Play as **Pip**, a 3-millimeter forest sprite wearing an acorn beret and a mossy leaf cloak, exploring a miniature garden microcosm where ordinary objects tower like ancient monuments.

---

## Core Gameplay & Tiny World Mechanics

- **Surface-Tension Bounce Pads**: Morning dewdrops, crimped bottle caps, and red toadstools launch Pip high into the air. Hold Jump on impact for extra rebound height.
- **Dandelion Seed Glide**: Hold **Jump** while airborne to open a fluffy dandelion seed parachute, slowing descent and riding warm **sunbeam**, **mist**, and **steam** updrafts.
- **Dew-Dash**: Trigger a quick horizontal air dash to cross wide gaps or recover from mistimed leaps. Resets automatically upon landing or bouncing.
- **Macro Hazards & Creatures**: Stomp patrolling **Ladybugs** and **Clock Beetles** from above to bounce off their shells, and avoid thorny brambles, sticky tree sap, swinging watch pendulums, and telegraphed raindrops.
- **5 Handcrafted Miniature Biomes**:
  1. **Morning Leaf** *(Scale 1:300 · Clover Patch)* — Sunlit leaves, bouncy dewdrops, and sunbeam updrafts.
  2. **Picnic Ruins** *(Scale 1:250 · Blanket Edge)* — Giant matchstick bridges, sugar cubes, and bottle-cap springs.
  3. **Moss Terrarium** *(Scale 1:200 · Glass Jar)* — Quartz crystals, springy toadstools, and rising mist columns.
  4. **Raindrop Canopy** *(Scale 1:180 · High Ferns)* — Lotus pads, spider-silk tightropes, and heavy macro raindrops.
  5. **The Pocket Watch** *(Scale 1:150 · Clockwork Core)* — Spinning brass gears that carry Pip, ticking pendulums, and steam vents.

---

## Controls

### Mobile Touchscreen
- **Left Thumb**: Drag the virtual analog thumbstick to move left/right.
- **Right Thumb**: Tap **Jump** to leap; **hold Jump** in mid-air to glide with the dandelion parachute; tap **Dash** for an air burst.
- On-screen touch controls automatically appear on touch/mobile devices and can also be toggled anytime using the gamepad icon in the top HUD.

### Desktop Keyboard
- **Move**: `A` / `D` or `Arrow Left` / `Arrow Right`
- **Jump & Glide**: `Space`, `W`, or `Arrow Up` (hold while falling to glide)
- **Dew-Dash**: `Shift`, `K`, or `X`
- **Pause**: `Esc` or `P`

---

## Mobile App Support (PWA)

The web application is configured as an installable **Progressive Web App (PWA)** with full offline caching via `vite-plugin-pwa`:
- **Android (Chrome / Edge)**: Tap **Install Mobile App** on the title screen (or **Add to Home Screen** in the browser menu) to run fullscreen without browser chrome and play offline.
- **iOS (Safari)**: Tap **Install on iOS** on the title screen for guided **Share → Add to Home Screen** steps.
- **Offline Play**: Service Worker precaches the game engine, fonts, and icons so all 5 stages and saved progress work offline.

---

## C# / Unity Implementation (`unity-csharp/`)

All game systems, physics, audio synthesis, mobile touch controls, and all 5 levels have been converted into idiomatic **Unity C#** under `unity-csharp/Assets/Scripts/`:

| C# Script | Responsibility |
| :--- | :--- |
| `TinyWorldTypes.cs` | Enums (`BiomeId`, `PlatformKind`, `HazardKind`, `CollectibleKind`) and serializable stage/save data classes. |
| `PlayerController2D.cs` | `Rigidbody2D` platformer physics, coyote time (`0.11s`), jump buffering (`0.13s`), dandelion glide, updraft lift, Dew-Dash, moving gear carry, and squash-and-stretch. |
| `WorldEntities.cs` | `MovingOrRotatingPlatform`, `BouncePadTrigger`, `UpdraftZone`, `PatrolBeetle`, `HazardBehaviour` (bramble/sap/pendulum/raindrop), `CollectiblePickup`, and `GoalBeacon`. |
| `StageCatalog.cs` | Complete C# definitions for all 5 Tiny World stages scaled to Unity world coordinates. |
| `SoundManager.cs` | Procedural `AudioClip.Create` synthesizer for jump, bounce, dash, ascending pentatonic pollen chimes, relic fanfare, stage clear, and kalimba background music. |
| `MobileTouchInput.cs` | `IPointerDownHandler` / `IDragHandler` / `IPointerUpHandler` virtual thumbstick and touch Jump/Dash controls unified with keyboard input. |
| `GameManager.cs` | Runtime stage builder, smooth camera follow, HUD & screen state machine, and `PlayerPrefs` JSON save persistence. |

---

## How to Build the Android APK

> **Note:** Compiling a signed binary `.apk` requires the Android SDK, OpenJDK, and Gradle (or Unity Editor with Android Build Support), which are not present in the browser preview sandbox. Use either workflow below on your local machine to generate the `.apk`.

### Option A: Build APK in Unity (Recommended for Game Jam 2026)
1. Install **Unity Hub** and **Unity 2022.3 LTS / Unity 6** with **Android Build Support**, **Android SDK & NDK Tools**, and **OpenJDK** checked.
2. Create a new **2D (URP or Built-in)** Unity project.
3. Copy the entire `unity-csharp/Assets/Scripts/` folder into your Unity project's `Assets/Scripts/` directory.
4. Create a Layer named `Ground` (in *Edit → Project Settings → Tags and Layers*) and assign it to the scene or let `GameManager` build the stage dynamically.
5. Attach `GameManager` and `SoundManager` to an empty GameObject in your main scene, assign your `Camera.main`, and hook up your UI Canvas panels & `MobileTouchInput`.
6. Open **File → Build Profiles** (or **Build Settings**), switch platform to **Android**, set **Default Orientation** to Landscape or Auto Rotation in *Player Settings*, and click **Build** to export `TinyWorld.apk`.

### Option B: Package the Web PWA directly as an Android APK (Bubblewrap TWA)
If you want to wrap the deployed PWA directly into an Android `.apk`:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://<your-deployed-app-url>/manifest.webmanifest
bubblewrap build
```
This outputs `app-release-signed.apk` ready for installation on Android devices.

---

## Running the Web App Locally

```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
```
