# Abedellah Abusuhaiban: portfolio

Personal portfolio site. No build step: open `index.html`.

- `index.html`: the main page (career and education timelines, credentials, case room, contact).
- `theater.html`: the Theater, a WebGL room of 42 screens entered through a black hole.
- `assets/data.js`: every screen's content, the weekly cases and the planned cases. Edit this to publish a case.
- `assets/viz.js`: the diagram drawn on each screen.
- `assets/js/`: the Theater engine (`theater.js`, `theater-ui.js`, `screens.js`), the black hole shader (`blackhole.js`) and the 3D figure (`figure.js`).
- `assets/models/figure.json`: the rigged figure as glTF (Ready Player Me sample from the three.js examples, restyled in code).
- `assets/vendor/three/`: three.js r170 (MIT licence).

Adding `?speed=10` to the Theater address fast-forwards the intro, for testing.
