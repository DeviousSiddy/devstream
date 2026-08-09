function initCanvas(container, opts) {
  opts = opts || {};

  const CANVAS_WIDTH = opts.width || 32;
  const CANVAS_HEIGHT = opts.height || 32;
  const STATE_URL = opts.stateUrl;
  const PALETTE_URL = opts.paletteUrl;
  const DISPLAY_SIZE = opts.displaySize || 300;
  const ENLARGED_SIZE = opts.enlargedSize || 900;
  const ENLARGED_LEFT = opts.enlargedLeft;
  const ENLARGED_BOTTOM = opts.enlargedBottom;
  const FADE_OPACITY = opts.fadeOpacity ?? 0.5;
  const ENLARGE_ON_CLICK = opts.enlargeOnClick !== false;

  let palette = {};
  let pixelElements = [];
  let currentCanvasState = {};
  let opacityTimeout = null;
  let isEnlarged = false;

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .pixel.changed {
        animation: blink-red 2s 5;
        position: relative;
        z-index: 10;
      }
      @keyframes blink-red {
        0%, 100% { box-shadow: none; }
        50% { box-shadow: 0 0 0 3px red; }
      }
      .author-tag {
        position: absolute;
        transform: translate(-50%, -120%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 18px;
        white-space: nowrap;
        z-index: 20;
      }
      .author-tag.fade-out-animation {
        animation: fade-out 10s ease-out forwards;
      }
      @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  function createGrid() {
    container.style.gridTemplateColumns = `repeat(${CANVAS_WIDTH}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${CANVAS_HEIGHT}, 1fr)`;

    pixelElements = Array.from({ length: CANVAS_HEIGHT }, () =>
      Array.from({ length: CANVAS_WIDTH }, () => null)
    );

    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const pixel = document.createElement('div');
        pixel.classList.add('pixel');
        container.appendChild(pixel);

        let authorTag = null;
        pixel.addEventListener('mouseover', () => {
          const pixelData = currentCanvasState.pixels?.[x]?.[y];
          const author = pixelData?.a;
          const source = pixelData?.s;

          if (author && !authorTag) {
            pixel.classList.add('changed');

            authorTag = document.createElement('div');
            authorTag.classList.add('author-tag');

            let sourceTag = '';
            if (source === 'Discord') sourceTag = '[D] ';
            else if (source === 'YouTube') sourceTag = '[YT] ';
            else if (source === 'Twitch') sourceTag = '[T] ';
            authorTag.textContent = `${sourceTag}${author}`;

            container.appendChild(authorTag);

            const pixelRect = pixel.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            authorTag.style.left = `${pixelRect.left - containerRect.left + pixelRect.width / 2}px`;
            authorTag.style.top = `${pixelRect.top - containerRect.top}px`;
          }
        });

        pixel.addEventListener('mouseout', () => {
          pixel.classList.remove('changed');
          if (authorTag) authorTag.remove();
          authorTag = null;
        });

        pixelElements[y][x] = pixel;
      }
    }
  }

  function showChangeAnimation(pixelEl, author, source) {
    const authorTag = document.createElement('div');
    authorTag.classList.add('author-tag');
    authorTag.classList.add('fade-out-animation');

    let sourceTag = '';
    if (source === 'Discord') sourceTag = '[D] ';
    else if (source === 'YouTube') sourceTag = '[YT] ';
    else if (source === 'Twitch') sourceTag = '[T] ';
    authorTag.textContent = `${sourceTag}${author}`;

    container.appendChild(authorTag);

    const pixelRect = pixelEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    authorTag.style.left = `${pixelRect.left - containerRect.left + pixelRect.width / 2}px`;
    authorTag.style.top = `${pixelRect.top - containerRect.top}px`;

    pixelEl.classList.add('changed');

    setTimeout(() => {
      pixelEl.classList.remove('changed');
      authorTag.remove();
    }, 1000);
  }

  function updateCanvas(canvasData) {
    if (!canvasData || !canvasData.pixels) return;

    let hasChanged = false;

    for (const x in canvasData.pixels) {
      for (const y in canvasData.pixels[x]) {
        const newPixelData = canvasData.pixels[x][y];
        const oldColorIndex = currentCanvasState.pixels?.[x]?.[y]?.c;

        const colorHex = palette[newPixelData.c] || '#000000';
        pixelElements[y][x].style.backgroundColor = colorHex;

        if (newPixelData.c !== oldColorIndex && oldColorIndex !== undefined) {
          showChangeAnimation(pixelElements[y][x], newPixelData.a, newPixelData.s);
          hasChanged = true;
        }
      }
    }

    if (hasChanged) {
      if (opacityTimeout) clearTimeout(opacityTimeout);
      container.style.opacity = '1';
      opacityTimeout = setTimeout(() => {
        if (!isEnlarged) container.style.opacity = String(FADE_OPACITY);
      }, 5000);
    }

    currentCanvasState = canvasData;
  }

  async function fetchAndUpdate() {
    try {
      const response = await fetch(`${STATE_URL}?t=${new Date().getTime()}`);
      if (response.ok) {
        const canvasData = await response.json();
        updateCanvas(canvasData);
      }
    } catch (error) {
      console.error('Error fetching canvas state:', error);
    }
  }

  async function init() {
    injectStyles();

    container.classList.add('canvas-grid');
    container.style.display = 'grid';
    container.style.width = DISPLAY_SIZE + 'px';
    container.style.height = DISPLAY_SIZE + 'px';
    container.style.opacity = String(FADE_OPACITY);
    container.style.transition = 'opacity 0.5s ease-in-out';
    container.style.backgroundColor = '#000';
    container.style.border = '2px solid #555';
    container.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';

    try {
      const paletteResponse = await fetch(PALETTE_URL);
      const data = await paletteResponse.json();
      for (const key in data) {
        palette[parseInt(key)] = data[key];
      }
    } catch (error) {
      console.error('Error loading palette:', error);
    }

    createGrid();
    await fetchAndUpdate();

    if (ENLARGE_ON_CLICK) {
      const wrapper = container.closest('.canvas-overlay') || container;
      const originalLeft = wrapper.style.left;
      const originalBottom = wrapper.style.bottom;

      container.addEventListener('click', () => {
        isEnlarged = !isEnlarged;

        if (isEnlarged) {
          container.style.width = ENLARGED_SIZE + 'px';
          container.style.height = ENLARGED_SIZE + 'px';
          container.style.opacity = '1';
          if (ENLARGED_LEFT !== undefined) wrapper.style.left = ENLARGED_LEFT + 'px';
          if (ENLARGED_BOTTOM !== undefined) wrapper.style.bottom = ENLARGED_BOTTOM + 'px';
        } else {
          container.style.width = DISPLAY_SIZE + 'px';
          container.style.height = DISPLAY_SIZE + 'px';
          container.style.opacity = String(FADE_OPACITY);
          wrapper.style.left = originalLeft;
          wrapper.style.bottom = originalBottom;
        }
      });
    }
  }

  const pollInterval = setInterval(fetchAndUpdate, 2000);
  init();

  return {
    destroy: () => {
      clearInterval(pollInterval);
      if (opacityTimeout) clearTimeout(opacityTimeout);
      container.innerHTML = '';
      container.removeAttribute('style');
    }
  };
}

function initCanvasOverlays(root) {
  if (!window.__canvasInitialized) window.__canvasInitialized = new WeakSet();
  if (!window.__canvasRegistry) window.__canvasRegistry = new Map();
  const scope = root || document;

  scope.querySelectorAll('.canvas-overlay').forEach(overlayEl => {
    if (window.__canvasInitialized.has(overlayEl)) return;

    const grid = overlayEl.querySelector('.canvas-grid');
    if (!grid) return;

    const handle = initCanvas(grid, {
      stateUrl: overlayEl.dataset.stateUrl,
      paletteUrl: overlayEl.dataset.paletteUrl,
      width: parseInt(overlayEl.dataset.gridWidth || 32),
      height: parseInt(overlayEl.dataset.gridHeight || 32),
      displaySize: parseInt(overlayEl.dataset.displaySize || 300),
      enlargedSize: parseInt(overlayEl.dataset.enlargedSize || 900),
      enlargedLeft: overlayEl.dataset.enlargedLeft !== undefined ? parseInt(overlayEl.dataset.enlargedLeft) : undefined,
      enlargedBottom: overlayEl.dataset.enlargedBottom !== undefined ? parseInt(overlayEl.dataset.enlargedBottom) : undefined,
      fadeOpacity: parseFloat(overlayEl.dataset.fadeOpacity || 0.5),
      enlargeOnClick: overlayEl.dataset.enlargeOnClick !== 'false'
    });

    window.__canvasInitialized.add(overlayEl);
    window.__canvasRegistry.set(overlayEl, handle);
  });
}

function destroyCanvasOverlays(root) {
  if (!window.__canvasRegistry) return;
  const entries = Array.from(window.__canvasRegistry.entries());
  for (const [el, handle] of entries) {
    if (root && !root.contains(el)) continue;
    handle.destroy();
    window.__canvasRegistry.delete(el);
    if (window.__canvasInitialized) window.__canvasInitialized.delete(el);
  }
}


