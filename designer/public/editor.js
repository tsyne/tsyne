// Visual Editor JavaScript

let metadata = null;
let selectedWidgetId = null;
let currentFilePath = null;
let currentStyles = null;
let currentSource = null;
let originalSource = null;
let currentScenarios = null;
let currentScenarioName = null;

// CSS editor state (for staging changes before save)
let editingStyles = null;

// Context menu state
let contextMenuTarget = null;

// Undo/Redo history
let commandHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// Find/Search state
let findResults = [];
let currentFindIndex = -1;
let matchedWidgetIds = new Set(); // Track which widgets have matches for tree highlighting

// Tree expand/collapse state
let collapsedNodes = new Set();

// Tab selection state (widget.id -> selected tab index)
let selectedTabs = {};

// Resize handle state
let isResizingLeft = false;
let isResizingRight = false;
let leftPanelWidth = 300;
let rightPanelWidth = 350;

// Initialize resize handles
document.addEventListener('DOMContentLoaded', () => {
  const resizeHandleLeft = document.getElementById('resizeHandleLeft');
  const resizeHandleRight = document.getElementById('resizeHandleRight');
  const editorContainer = document.querySelector('.editor-container');

  // Left resize handle (widget tree)
  if (resizeHandleLeft) {
    resizeHandleLeft.addEventListener('mousedown', (e) => {
      isResizingLeft = true;
      resizeHandleLeft.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
  }

  // Right resize handle (property inspector)
  if (resizeHandleRight) {
    resizeHandleRight.addEventListener('mousedown', (e) => {
      isResizingRight = true;
      resizeHandleRight.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!isResizingLeft && !isResizingRight) return;

    const containerRect = editorContainer.getBoundingClientRect();

    if (isResizingLeft) {
      const newWidth = e.clientX - containerRect.left;
      leftPanelWidth = Math.max(150, Math.min(500, newWidth));
    }

    if (isResizingRight) {
      const newWidth = containerRect.right - e.clientX;
      rightPanelWidth = Math.max(200, Math.min(600, newWidth));
    }

    editorContainer.style.gridTemplateColumns = `${leftPanelWidth}px 6px 1fr 6px ${rightPanelWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizingLeft) {
      isResizingLeft = false;
      resizeHandleLeft.classList.remove('dragging');
    }
    if (isResizingRight) {
      isResizingRight = false;
      resizeHandleRight.classList.remove('dragging');
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
});

// Known CSS properties (categorized)
const knownCssProperties = {
  'Color': ['color', 'backgroundColor', 'borderColor', 'outlineColor'],
  'Size': ['fontSize', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'],
  'Spacing': ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
              'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  'Border': ['border', 'borderWidth', 'borderStyle', 'borderRadius', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft'],
  'Layout': ['display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'overflow', 'overflowX', 'overflowY'],
  'Text': ['fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'textDecoration', 'lineHeight', 'letterSpacing'],
  'Flexbox': ['flexDirection', 'justifyContent', 'alignItems', 'alignContent', 'flexWrap', 'flex', 'flexGrow', 'flexShrink'],
  'Other': ['opacity', 'cursor', 'zIndex', 'boxShadow', 'textShadow', 'transform', 'transition']
};

// Flatten all known properties
const allKnownProperties = Object.values(knownCssProperties).flat();

// Helper: Check if a property is color-related
function isColorProperty(propName) {
  const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'background', 'fill', 'stroke'];
  return colorProps.some(cp => propName.toLowerCase().includes(cp.toLowerCase()));
}

// Property schemas for each widget type
const widgetPropertySchemas = {
  label: {
    text: { type: 'string', description: 'Label text' },
    className: { type: 'string', description: 'CSS class name' },
    alignment: { type: 'string', description: 'Text alignment (leading, center, trailing)' },
    wrapping: { type: 'string', description: 'Text wrapping mode' },
    textStyle: { type: 'object', description: 'Text styling options' }
  },
  button: {
    text: { type: 'string', description: 'Button text' },
    className: { type: 'string', description: 'CSS class name' }
  },
  entry: {
    placeholder: { type: 'string', description: 'Placeholder text' },
    minWidth: { type: 'number', description: 'Minimum width in pixels' }
  },
  checkbox: {
    text: { type: 'string', description: 'Checkbox label text' }
  },
  grid: {
    columns: { type: 'number', description: 'Number of columns' }
  },
  gridwrap: {
    itemWidth: { type: 'number', description: 'Item width' },
    itemHeight: { type: 'number', description: 'Item height' }
  },
  hsplit: {
    offset: { type: 'number', description: 'Split offset' }
  },
  vsplit: {
    offset: { type: 'number', description: 'Split offset' }
  },
  hyperlink: {
    text: { type: 'string', description: 'Link text' },
    url: { type: 'string', description: 'Link URL' }
  },
  image: {
    path: { type: 'string', description: 'Image path' },
    resource: { type: 'string', description: 'Resource name' },
    fillMode: { type: 'string', description: 'Fill mode' }
  },
  multilineentry: {
    placeholder: { type: 'string', description: 'Placeholder text' },
    wrapping: { type: 'string', description: 'Text wrapping mode' }
  },
  passwordentry: {
    placeholder: { type: 'string', description: 'Placeholder text' }
  },
  select: {
    options: { type: 'string', description: 'Comma-separated options' }
  },
  radiogroup: {
    options: { type: 'string', description: 'Comma-separated options' },
    initialSelected: { type: 'string', description: 'Initially selected option' }
  },
  slider: {
    min: { type: 'number', description: 'Minimum value' },
    max: { type: 'number', description: 'Maximum value' },
    initialValue: { type: 'number', description: 'Initial value' }
  },
  progressbar: {
    initialValue: { type: 'number', description: 'Initial value (0-100)' },
    infinite: { type: 'boolean', description: 'Infinite progress mode' }
  },
  table: {
    headers: { type: 'string', description: 'Comma-separated headers' },
    rows: { type: 'number', description: 'Number of rows' }
  },
  list: {
    items: { type: 'string', description: 'Comma-separated items' }
  },
  tree: {
    rootLabel: { type: 'string', description: 'Root node label' }
  },
  toolbar: {
    items: { type: 'string', description: 'Comma-separated toolbar items' }
  },
  window: {
    title: { type: 'string', description: 'Window title' },
    width: { type: 'number', description: 'Window width' },
    height: { type: 'number', description: 'Window height' }
  },
  card: {
    title: { type: 'string', description: 'Card title' },
    subtitle: { type: 'string', description: 'Card subtitle' }
  },
  tabs: {
    tabTitles: { type: 'string', description: 'Comma-separated tab titles' },
    location: { type: 'string', description: 'Tab position (top, bottom, leading, trailing)' }
  },
  accordion: {
    itemTitles: { type: 'string', description: 'Comma-separated accordion item titles' }
  },
  activity: {},
  center: {},
  padded: {},
  clip: {},
  innerWindow: {
    title: { type: 'string', description: 'Inner window title' }
  },
  adaptivegrid: {
    rowcols: { type: 'number', description: 'Number of rows/columns' }
  },
  selectentry: {
    options: { type: 'string', description: 'Comma-separated options' },
    placeholder: { type: 'string', description: 'Placeholder text' }
  },
  // Canvas primitives
  rectangle: {
    color: { type: 'string', description: 'Fill color (hex or name)' },
    width: { type: 'number', description: 'Width in pixels' },
    height: { type: 'number', description: 'Height in pixels' }
  },
  circle: {
    color: { type: 'string', description: 'Fill color (hex or name)' },
    radius: { type: 'number', description: 'Radius in pixels' }
  },
  line: {
    color: { type: 'string', description: 'Stroke color (hex or name)' },
    strokeWidth: { type: 'number', description: 'Line thickness' }
  },
  linearGradient: {
    startColor: { type: 'string', description: 'Starting color' },
    endColor: { type: 'string', description: 'Ending color' },
    angle: { type: 'number', description: 'Gradient angle in degrees' }
  },
  radialGradient: {
    centerColor: { type: 'string', description: 'Center color' },
    edgeColor: { type: 'string', description: 'Edge color' }
  },
  text: {
    content: { type: 'string', description: 'Text content' },
    size: { type: 'number', description: 'Font size' },
    color: { type: 'string', description: 'Text color' }
  }
};

// Hide context menu when clicking elsewhere
document.addEventListener('click', () => {
  hideContextMenu();
});

// Hide context menu
function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  menu.classList.remove('visible');
  contextMenuTarget = null;
}

// Show context menu
function showContextMenu(event, widget) {
  event.preventDefault();
  event.stopPropagation();

  const menu = document.getElementById('contextMenu');
  contextMenuTarget = widget;

  // Build menu content based on widget type
  menu.innerHTML = buildContextMenuContent(widget);

  // Position menu at cursor
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
  menu.classList.add('visible');
}

// Build context menu content based on widget type
function buildContextMenuContent(widget) {
  let menuItems = [];

  // Widget-specific menu items
  if (widget.widgetType === 'grid') {
    menuItems.push(`
      <div class="context-menu-submenu">
        <div class="context-menu-item">
          <span>Set Columns</span>
          <span class="context-menu-submenu-arrow">▶</span>
        </div>
        <div class="context-submenu">
          ${[1, 2, 3, 4, 5, 6].map(cols => `
            <div class="context-menu-item" onclick="setWidgetProperty('${widget.id}', 'columns', ${cols}); hideContextMenu();">
              ${cols} Column${cols > 1 ? 's' : ''}
            </div>
          `).join('')}
          <div class="context-menu-separator"></div>
          <div class="context-menu-item" onclick="promptPropertyValue('${widget.id}', 'columns', 'Enter number of columns');">
            Custom...
          </div>
        </div>
      </div>
    `);
  } else if (widget.widgetType === 'gridwrap') {
    menuItems.push(`
      <div class="context-menu-item" onclick="promptPropertyValue('${widget.id}', 'itemWidth', 'Enter item width');">
        Set Item Width
      </div>
      <div class="context-menu-item" onclick="promptPropertyValue('${widget.id}', 'itemHeight', 'Enter item height');">
        Set Item Height
      </div>
    `);
  } else if (widget.widgetType === 'hsplit' || widget.widgetType === 'vsplit') {
    if (widget.properties.offset !== undefined) {
      menuItems.push(`
        <div class="context-menu-item" onclick="promptPropertyValue('${widget.id}', 'offset', 'Enter split offset');">
          Set Offset
        </div>
      `);
    }
  }

  // Common menu items for all widgets
  if (menuItems.length > 0) {
    menuItems.push('<div class="context-menu-separator"></div>');
  }

  menuItems.push(`
    <div class="context-menu-item" onclick="selectWidget('${widget.id}'); hideContextMenu();">
      <span>⚙</span> Edit Properties
    </div>
  `);

  menuItems.push(`
    <div class="context-menu-item" onclick="deleteWidget('${widget.id}'); hideContextMenu();">
      <span>🗑</span> Delete Widget
    </div>
  `);

  return menuItems.join('');
}

// Set widget property from context menu (generic)
async function setWidgetProperty(widgetId, propertyName, value) {
  await updateProperty(widgetId, propertyName, value, 'number');
  // Note: updateProperty already updates metadata and re-renders the UI
  // No need to reload from disk - that would discard the property change!
}

// Prompt for property value (generic)
function promptPropertyValue(widgetId, propertyName, promptText) {
  const widget = metadata.widgets.find(w => w.id === widgetId);
  const currentValue = widget.properties[propertyName] || '';

  const newValue = prompt(promptText + ':', currentValue);
  if (newValue !== null) {
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue > 0) {
      setWidgetProperty(widgetId, propertyName, numValue);
    } else {
      alert('Please enter a valid positive number');
    }
  }
  hideContextMenu();
}

// Load selected file from dropdown
async function loadSelectedFile() {
  const select = document.getElementById('fileSelect');
  const filePath = select.value;
  await loadFile(filePath);
}

// Load file and metadata
async function loadFile(filePath = 'examples/hello.ts') {
  try {
    const response = await fetch('/api/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    });

    const data = await response.json();
    metadata = data.metadata;
    currentFilePath = data.filePath;
    currentStyles = data.styles;

    // Store original source
    originalSource = data.originalSource || null;
    currentSource = data.originalSource || null;

    document.getElementById('filePath').textContent = currentFilePath;

    // Show CSS Editor button if styles exist
    const cssEditorBtn = document.getElementById('cssEditorBtn');
    if (currentStyles && Object.keys(currentStyles).length > 0) {
      cssEditorBtn.style.display = 'inline-block';
    } else {
      cssEditorBtn.style.display = 'none';
    }

    // Handle scenarios
    currentScenarios = data.scenarios || null;
    currentScenarioName = data.currentScenario || null;
    renderScenarioSelector();

    renderWidgetTree();
    renderPreview();
    applyStylesToPreview();

    console.log('Loaded metadata:', metadata);
    console.log('Loaded styles:', currentStyles);
  } catch (error) {
    console.error('Error loading file:', error);
    alert('Error loading file: ' + error.message);
  }
}

// Render scenario selector radio buttons
function renderScenarioSelector() {
  const selectorDiv = document.getElementById('scenarioSelector');
  const radiosDiv = document.getElementById('scenarioRadios');

  if (!currentScenarios || currentScenarios.length === 0) {
    selectorDiv.style.display = 'none';
    return;
  }

  selectorDiv.style.display = 'flex';
  radiosDiv.innerHTML = '';

  currentScenarios.forEach((scenario, index) => {
    const label = document.createElement('label');
    label.className = 'scenario-radio' + (scenario.name === currentScenarioName ? ' selected' : '');
    label.title = scenario.description || '';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'scenario';
    radio.value = scenario.name;
    radio.checked = scenario.name === currentScenarioName;
    radio.onchange = () => selectScenario(scenario.name);

    const text = document.createTextNode(scenario.name);

    label.appendChild(radio);
    label.appendChild(text);
    radiosDiv.appendChild(label);
  });
}

// Select a scenario and reload
async function selectScenario(scenarioName) {
  try {
    const response = await fetch('/api/select-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: scenarioName })
    });

    const result = await response.json();
    if (result.success) {
      currentScenarioName = scenarioName;
      // Reload the file to apply the new scenario
      await loadFile(currentFilePath);
    } else {
      console.error('Failed to select scenario:', result.error);
      alert('Failed to select scenario: ' + result.error);
    }
  } catch (error) {
    console.error('Error selecting scenario:', error);
    alert('Error selecting scenario: ' + error.message);
  }
}

// Switch preview tab
function switchPreviewTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.preview-tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const contentId = 'previewTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const contentElement = document.getElementById(contentId);
  if (contentElement) {
    contentElement.classList.add('active');
  }

  // Render content for the selected tab
  if (tabName === 'source') {
    renderSourceTab();
  } else if (tabName === 'original') {
    renderOriginalSourceTab();
  } else if (tabName === 'diff') {
    renderDiffTab();
  } else if (tabName === 'designer') {
    renderDesignerFileTab();
  }
}

// Render source tab with syntax highlighting
function renderSourceTab() {
  const sourceContent = document.getElementById('sourceContent');
  if (currentSource) {
    sourceContent.textContent = currentSource;
    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(sourceContent);
    }
  } else {
    sourceContent.textContent = 'No source available';
  }
}

// Render original source tab with syntax highlighting
function renderOriginalSourceTab() {
  const originalSourceContent = document.getElementById('originalSourceContent');
  if (originalSource) {
    originalSourceContent.textContent = originalSource;
    if (typeof Prism !== 'undefined') {
      Prism.highlightElement(originalSourceContent);
    }
  } else {
    originalSourceContent.textContent = 'No original source available';
  }
}

// Render designer file tab with syntax highlighting
async function renderDesignerFileTab() {
  const designerFileContent = document.getElementById('designerFileContent');
  designerFileContent.textContent = 'Loading designer file...';

  try {
    const response = await fetch('/api/designer-file');
    const result = await response.json();

    if (result.success) {
      if (result.content) {
        designerFileContent.textContent = result.content;
        if (typeof Prism !== 'undefined') {
          Prism.highlightElement(designerFileContent);
        }
      } else {
        designerFileContent.textContent = result.message || 'No designer file for this source.\n\nCreate a file named [sourcename]_designer.ts to define scenarios and mock data.';
      }
    } else {
      designerFileContent.textContent = 'Error loading designer file: ' + result.error;
    }
  } catch (error) {
    designerFileContent.textContent = 'Error loading designer file: ' + error.message;
  }
}

// Render diff tab - now uses server-side semantic diff
async function renderDiffTab() {
  const diffContent = document.getElementById('diffContent');

  try {
    // Get semantic diff from server using the 'diff' npm library
    const response = await fetch('/api/get-diff');
    const data = await response.json();

    if (data.success) {
      diffContent.innerHTML = data.html;
    } else {
      diffContent.textContent = 'Error loading diff: ' + data.error;
    }
  } catch (error) {
    console.error('Error fetching diff:', error);
    diffContent.textContent = 'Error loading diff: ' + error.message;
  }
}

// Copy widget tree to clipboard as outlined text
function copyTreeToClipboard() {
  if (!metadata || !metadata.widgets) {
    alert('No widget tree to copy');
    return;
  }

  const rootWidgets = metadata.widgets.filter(w => !w.parent);
  let treeText = '';

  function widgetToText(widget, indent = '') {
    const hasId = widget.widgetId && widget.widgetId.trim() !== '';
    const displayName = hasId ? `${widget.widgetId} (${widget.widgetType})` : widget.widgetType;
    const propsText = getPropsPreview(widget.properties);

    treeText += indent + displayName;
    if (propsText) {
      treeText += ' ' + propsText;
    }
    treeText += '\n';

    const children = metadata.widgets.filter(w => w.parent === widget.id);
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const childIndent = indent + (isLast ? '└─ ' : '├─ ');
      const continuationIndent = indent + (isLast ? '   ' : '│  ');

      widgetToText(child, childIndent);

      // Update indent for next iteration
      if (index < children.length - 1) {
        const nextChildren = metadata.widgets.filter(w => w.parent === child.id);
        if (nextChildren.length > 0) {
          // This child has children, so we need proper indentation
          treeText = treeText.trimEnd() + '\n';
        }
      }
    });
  }

  rootWidgets.forEach(widget => {
    widgetToText(widget);
    treeText += '\n';
  });

  navigator.clipboard.writeText(treeText.trim()).then(() => {
    // Visual feedback
    const btn = document.querySelector('.tree-header-copy');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓';
    btn.style.color = '#0e639c';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.color = '';
    }, 1500);
  }).catch(err => {
    alert('Failed to copy to clipboard: ' + err.message);
  });
}

// Show drop indicator before a tree item
function showDropIndicator(beforeElement) {
  // Remove any existing indicator
  removeDropIndicator();

  // Create new indicator
  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';

  // Find the correct insertion point:
  // If the element's parent has the tree-item class, this element is wrapped
  // We need to insert before the wrapper, not before the tree-item itself
  let insertionPoint = beforeElement;

  // Get the widget ID from the tree item
  const widgetId = beforeElement.dataset.widgetId;
  const widget = metadata.widgets.find(w => w.id === widgetId);

  console.log('[DROP INDICATOR] Showing for widget:', widgetId, widget?.widgetType, widget?.properties?.text);
  console.log('[DROP INDICATOR] beforeElement:', beforeElement);
  console.log('[DROP INDICATOR] beforeElement.parentNode:', beforeElement.parentNode);
  console.log('[DROP INDICATOR] Has .tree-children sibling?', beforeElement.parentNode.querySelector('.tree-children') !== null);

  // Check if the parent node is a wrapper (contains both tree-item and tree-children)
  if (beforeElement.parentNode && beforeElement.parentNode.querySelector &&
      beforeElement.parentNode.querySelector('.tree-item') === beforeElement &&
      beforeElement.parentNode.querySelector('.tree-children')) {
    // This is a wrapped tree item (has children), insert before the wrapper
    console.log('[DROP INDICATOR] Wrapped item detected, inserting before wrapper');
    insertionPoint = beforeElement.parentNode;
  } else {
    console.log('[DROP INDICATOR] Not wrapped, inserting before tree-item directly');
  }

  console.log('[DROP INDICATOR] Final insertionPoint:', insertionPoint);
  console.log('[DROP INDICATOR] Will insert before:', insertionPoint);

  // Insert before the insertion point
  insertionPoint.parentNode.insertBefore(indicator, insertionPoint);

  console.log('[DROP INDICATOR] Indicator inserted');
}

// Remove drop indicator
function removeDropIndicator() {
  const existing = document.querySelectorAll('.drop-indicator');
  existing.forEach(el => el.remove());
}

// Render widget tree
function renderWidgetTree() {
  const treeRoot = document.getElementById('treeRoot');
  treeRoot.innerHTML = '';

  if (!metadata || !metadata.widgets) {
    treeRoot.innerHTML = '<div class="no-selection">No widgets found</div>';
    return;
  }

  // Find root widgets (those without a parent)
  const rootWidgets = metadata.widgets.filter(w => !w.parent);

  rootWidgets.forEach(widget => {
    const element = createTreeItem(widget);
    treeRoot.appendChild(element);
  });
}

// Create tree item element
function createTreeItem(widget) {
  const item = document.createElement('div');
  item.className = 'tree-item';
  if (selectedWidgetId === widget.id) {
    item.classList.add('selected');
  }

  // Make item draggable (but not window widgets)
  if (widget.widgetType !== 'window') {
    item.draggable = true;
    item.dataset.widgetId = widget.id;

    // Drag start
    item.ondragstart = (e) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', widget.id);
      item.classList.add('dragging');
    };

    // Drag end
    item.ondragend = (e) => {
      e.stopPropagation();
      item.classList.remove('dragging');
      // Remove all drop indicators
      removeDropIndicator();
    };

    // Drag over - show drop indicator
    item.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';

      const draggingId = e.dataTransfer.getData('text/plain');
      if (draggingId !== widget.id) {
        // Show drop indicator after this item
        showDropIndicator(item);
      }
    };

    // Drag leave
    item.ondragleave = (e) => {
      e.stopPropagation();
      // Check if we're leaving to a child or to outside
      if (!e.relatedTarget || !item.contains(e.relatedTarget)) {
        // Only remove if we're truly leaving this item
        const indicator = document.querySelector('.drop-indicator');
        if (indicator && indicator.previousElementSibling === item) {
          removeDropIndicator();
        }
      }
    };

    // Drop
    item.ondrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeDropIndicator();

      const draggedId = e.dataTransfer.getData('text/plain');
      const targetId = widget.id;

      console.log('[DROP] ========== DROP EVENT ==========');
      console.log('[DROP] draggedId:', draggedId, 'targetId:', targetId);

      if (draggedId !== targetId) {
        // Find the dragged and target widgets in metadata to determine drag direction
        const draggedWidget = metadata.widgets.find(w => w.id === draggedId);
        const targetWidget = metadata.widgets.find(w => w.id === targetId);

        console.log('[DROP] Dragged widget:', draggedWidget?.widgetType, draggedWidget?.properties?.text);
        console.log('[DROP] Target widget:', targetWidget?.widgetType, targetWidget?.properties?.text);

        // Check if they're siblings (have the same parent)
        if (draggedWidget && targetWidget && draggedWidget.parent === targetWidget.parent) {
          // Get all siblings
          const siblings = metadata.widgets.filter(w => w.parent === draggedWidget.parent);

          console.log('[DROP] All siblings in order:');
          siblings.forEach((s, i) => {
            console.log(`[DROP]   ${i}: ${s.id} - ${s.widgetType} "${s.properties?.text || ''}"`);
          });

          const draggedIndex = siblings.findIndex(w => w.id === draggedId);
          const targetIndex = siblings.findIndex(w => w.id === targetId);

          console.log('[DROP] Dragged index:', draggedIndex, 'Target index:', targetIndex);
          console.log('[DROP] Direction:', draggedIndex > targetIndex ? 'UP' : 'DOWN');

          // Always insert after the target (where the visual indicator shows)
          console.log('[DROP] Inserting after target widget');
          await reorderWidget(draggedId, targetId);
        } else {
          // Different parents or not found - use normal reorder
          console.log('[DROP] Different parents or widgets not found - using normal reorder');
          await reorderWidget(draggedId, targetId);
        }
      }
      console.log('[DROP] ========== END DROP EVENT ==========');
    };
  }

  // Icon based on widget type
  const icon = getWidgetIcon(widget.widgetType);

  // Properties preview
  const propsText = getPropsPreview(widget.properties);

  // Format display: if widget has ID, show "ID (type)", else show "type"
  const hasId = widget.widgetId && widget.widgetId.trim() !== '';
  const displayText = hasId
    ? `<span class="widget-id">${widget.widgetId}</span> <span class="widget-type-parens">(${widget.widgetType})</span>`
    : `<span class="widget-type">${widget.widgetType}</span>`;

  // Add search match indicator
  const isMatched = matchedWidgetIds.has(widget.id);
  const matchIndicator = isMatched ? '<span style="color: #f9826c; font-weight: bold; margin-left: 6px;" title="Search match">🔍</span>' : '';

  item.innerHTML = `
    <span class="icon">${icon}</span>
    ${displayText}
    ${propsText ? `<span class="widget-props">${propsText}</span>` : ''}
    ${matchIndicator}
  `;

  item.onclick = (e) => {
    e.stopPropagation();
    selectWidget(widget.id);
  };

  // Add right-click context menu
  item.oncontextmenu = (e) => {
    e.stopPropagation();
    showContextMenu(e, widget);
  };

  // Add children if any
  const children = metadata.widgets.filter(w => w.parent === widget.id);
  if (children.length > 0) {
    const isCollapsed = collapsedNodes.has(widget.id);

    // Add toggle button at the start
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle' + (isCollapsed ? ' collapsed' : '');
    toggle.innerHTML = isCollapsed ? '▶' : '▼';
    toggle.onclick = (e) => {
      e.stopPropagation();
      toggleTreeNode(widget.id);
    };
    item.insertBefore(toggle, item.firstChild);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    if (isCollapsed) {
      childrenContainer.style.display = 'none';
    }
    children.forEach(child => {
      childrenContainer.appendChild(createTreeItem(child));
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(item);
    wrapper.appendChild(childrenContainer);
    return wrapper;
  }

  return item;
}

// Toggle tree node expand/collapse
function toggleTreeNode(widgetId) {
  if (collapsedNodes.has(widgetId)) {
    collapsedNodes.delete(widgetId);
  } else {
    collapsedNodes.add(widgetId);
  }
  renderWidgetTree();
}

// Switch inspector tab (Add Widgets / Properties)
function switchInspectorTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.inspector-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  // Update tab content
  document.querySelectorAll('.inspector-tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const contentId = tabName === 'widgets' ? 'inspectorWidgets' : 'inspectorProperties';
  document.getElementById(contentId).classList.add('active');
}

// Get widget icon
function getWidgetIcon(type) {
  const icons = {
    // Containers
    'window': '□',
    'vbox': '⬍',
    'hbox': '⬌',
    'scroll': '⤓',
    'grid': '⊞',
    'gridwrap': '⊟',
    'center': '⊙',
    'hsplit': '⫴',
    'vsplit': '⫵',
    'tabs': '⊟',
    'card': '▢',
    'accordion': '≡',
    'form': '▦',
    'border': '▭',
    'clip': '✂',
    'innerWindow': '□',
    'adaptivegrid': '⊞',
    'padded': '▢',
    // Input widgets
    'button': '▭',
    'label': 'T',
    'entry': '⎕',
    'multilineentry': '▤',
    'passwordentry': '◆',
    'checkbox': '☑',
    'select': '▼',
    'selectentry': '▼',
    'radiogroup': '◉',
    'slider': '◧',
    'progressbar': '▬',
    'toolbar': '▭',
    // Display widgets
    'separator': '─',
    'spacer': '↕',
    'hyperlink': '⎙',
    'image': '⛶',
    'richtext': '⚑',
    'table': '▦',
    'list': '☰',
    'tree': '⌲',
    'activity': '◌',
    // Canvas primitives
    'rectangle': '■',
    'circle': '●',
    'line': '╱',
    'linearGradient': '▤',
    'radialGradient': '◎',
    'text': 'A'
  };
  return icons[type] || '○';
}

// Get properties preview for tree
function getPropsPreview(props) {
  if (!props) return '';

  if (props.text) {
    return `"${props.text.substring(0, 30)}${props.text.length > 30 ? '...' : ''}"`;
  }

  if (props.title) {
    return `"${props.title}"`;
  }

  return '';
}

// Select a widget
function selectWidget(widgetId) {
  selectedWidgetId = widgetId;
  renderWidgetTree();
  renderProperties();

  // Auto-switch to Properties tab when a widget is selected
  document.querySelectorAll('.inspector-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.inspector-tab-content').forEach(content => content.classList.remove('active'));
  document.querySelector('.inspector-tab:nth-child(2)')?.classList.add('active');
  document.getElementById('inspectorProperties')?.classList.add('active');
}

// Render properties panel
function renderProperties() {
  const content = document.getElementById('propertiesContent');

  if (!selectedWidgetId) {
    content.innerHTML = '<div class="no-selection">Select a widget to edit properties</div>';
    return;
  }

  const widget = metadata.widgets.find(w => w.id === selectedWidgetId);
  if (!widget) {
    content.innerHTML = '<div class="no-selection">Widget not found</div>';
    return;
  }

  content.innerHTML = `
    <div class="property-section">
      <h3>Widget Info</h3>
      <div class="property-row">
        <span class="property-label">Type</span>
        <div class="property-value">${widget.widgetType}</div>
      </div>
      <div class="property-row">
        <label class="property-label">ID</label>
        <input
          type="text"
          class="property-input"
          value="${widget.widgetId ? escapeHtml(widget.widgetId) : ''}"
          placeholder="${widget.widgetId ? '' : '(no ID)'}"
          onchange="updateWidgetId('${widget.id}', this.value)"
        />
      </div>
    </div>

    <div class="property-section">
      <h3>Source Location</h3>
      <div class="location-info">
        ${widget.sourceLocation.file}:${widget.sourceLocation.line}:${widget.sourceLocation.column}
      </div>
    </div>

    <div class="property-section">
      <h3>Properties</h3>
      ${renderPropertyInputs(widget)}
    </div>

    ${widget.eventHandlers && Object.keys(widget.eventHandlers).length > 0 ? `
      <div class="property-section">
        <h3>Event Handlers</h3>
        ${renderEventHandlers(widget.eventHandlers)}
      </div>
    ` : ''}

    ${widget.mouseEventHandlers && Object.keys(widget.mouseEventHandlers).length > 0 ? `
      <div class="property-section">
        <h3>Mouse Event Handlers</h3>
        ${renderEventHandlers(widget.mouseEventHandlers)}
      </div>
    ` : ''}

    <div class="property-section">
      <h3>Accessibility</h3>
      ${renderAccessibilityInputs(widget)}
    </div>

    <div class="property-section">
      <button class="delete-button" onclick="deleteWidget('${widget.id}')">Delete Widget</button>
    </div>
  `;
}

// Render property inputs
function renderPropertyInputs(widget) {
  const schema = widgetPropertySchemas[widget.widgetType] || {};
  const schemaKeys = Object.keys(schema);

  // If no schema and no properties, show message
  if (schemaKeys.length === 0 && (!widget.properties || Object.keys(widget.properties).length === 0)) {
    return '<div class="no-selection">No editable properties</div>';
  }

  let html = '';

  // Render all properties from schema (whether they exist or not)
  schemaKeys.forEach(key => {
    const propSchema = schema[key];
    const value = widget.properties?.[key];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (propSchema.type === 'string') {
      html += `
        <div class="property-row">
          <label class="property-label" title="${propSchema.description}">${key}</label>
          <input
            type="text"
            class="property-input"
            value="${hasValue ? escapeHtml(String(value)) : ''}"
            placeholder="${hasValue ? '' : 'Not set'}"
            onchange="updateProperty('${widget.id}', '${key}', this.value, 'string')"
          />
        </div>
      `;
    } else if (propSchema.type === 'number') {
      html += `
        <div class="property-row">
          <label class="property-label" title="${propSchema.description}">${key}</label>
          <input
            type="number"
            class="property-input"
            value="${hasValue ? value : ''}"
            placeholder="${hasValue ? '' : 'Not set'}"
            onchange="updateProperty('${widget.id}', '${key}', this.value, 'number')"
          />
        </div>
      `;
    } else if (propSchema.type === 'boolean') {
      html += `
        <div class="property-row">
          <label class="property-label" title="${propSchema.description}">${key}</label>
          <input
            type="checkbox"
            class="property-checkbox"
            ${value ? 'checked' : ''}
            onchange="updateProperty('${widget.id}', '${key}', this.checked, 'boolean')"
          />
        </div>
      `;
    } else {
      // For complex types (object, etc.), show as JSON if they have a value
      if (hasValue) {
        html += `
          <div class="property-row">
            <span class="property-label" title="${propSchema.description}">${key}</span>
            <div class="property-value">${JSON.stringify(value)}</div>
          </div>
        `;
      }
    }
  });

  // Also show any properties that exist but aren't in the schema
  if (widget.properties) {
    Object.entries(widget.properties).forEach(([key, value]) => {
      if (!schema[key]) {
        if (typeof value === 'string') {
          html += `
            <div class="property-row">
              <label class="property-label">${key}</label>
              <input
                type="text"
                class="property-input"
                value="${escapeHtml(value)}"
                onchange="updateProperty('${widget.id}', '${key}', this.value, 'string')"
              />
            </div>
          `;
        } else if (typeof value === 'number') {
          html += `
            <div class="property-row">
              <label class="property-label">${key}</label>
              <input
                type="number"
                class="property-input"
                value="${value}"
                onchange="updateProperty('${widget.id}', '${key}', this.value, 'number')"
              />
            </div>
          `;
        } else {
          html += `
            <div class="property-row">
              <span class="property-label">${key}</span>
              <div class="property-value">${JSON.stringify(value)}</div>
            </div>
          `;
        }
      }
    });
  }

  return html || '<div class="no-selection">No editable properties</div>';
}

// Render event handlers
function renderEventHandlers(handlers) {
  return Object.entries(handlers)
    .map(([name, code]) => `
      <div class="property-row">
        <span class="property-label">${name}</span>
        <div class="property-value" style="white-space: pre-wrap; font-size: 11px; max-height: 100px; overflow-y: auto;">${escapeHtml(code)}</div>
      </div>
    `)
    .join('');
}

// Render accessibility inputs
function renderAccessibilityInputs(widget) {
  const accessibility = widget.accessibility || {};

  return `
    <div class="property-row">
      <label class="property-label" title="Accessibility label for screen readers">Label</label>
      <input
        type="text"
        class="property-input"
        value="${accessibility.label ? escapeHtml(accessibility.label) : ''}"
        placeholder="Not set"
        onchange="updateAccessibility('${widget.id}', 'label', this.value)"
      />
    </div>
    <div class="property-row">
      <label class="property-label" title="Detailed description for screen readers">Description</label>
      <input
        type="text"
        class="property-input"
        value="${accessibility.description ? escapeHtml(accessibility.description) : ''}"
        placeholder="Not set"
        onchange="updateAccessibility('${widget.id}', 'description', this.value)"
      />
    </div>
    <div class="property-row">
      <label class="property-label" title="Hint text for user interaction">Hint</label>
      <input
        type="text"
        class="property-input"
        value="${accessibility.hint ? escapeHtml(accessibility.hint) : ''}"
        placeholder="Not set"
        onchange="updateAccessibility('${widget.id}', 'hint', this.value)"
      />
    </div>
    <div class="property-row">
      <label class="property-label" title="ARIA role for the widget">Role</label>
      <input
        type="text"
        class="property-input"
        value="${accessibility.role ? escapeHtml(accessibility.role) : ''}"
        placeholder="Not set"
        onchange="updateAccessibility('${widget.id}', 'role', this.value)"
      />
    </div>
  `;
}

// Update widget ID
async function updateWidgetId(internalId, newWidgetId) {
  newWidgetId = newWidgetId.trim();

  const widget = metadata.widgets.find(w => w.id === internalId);
  if (!widget) {
    alert('Widget not found');
    renderProperties();
    return;
  }

  const oldWidgetId = widget.widgetId || null;

  // Check if there's actually a change
  if (oldWidgetId === newWidgetId || (!oldWidgetId && !newWidgetId)) {
    return;
  }

  // Validate new widget ID if not empty
  if (newWidgetId && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newWidgetId)) {
    alert('Invalid widget ID. Must start with letter or underscore, and contain only letters, numbers, and underscores.');
    renderProperties();
    return;
  }

  // Check if new widget ID already exists
  if (newWidgetId && metadata.widgets.find(w => w.widgetId === newWidgetId)) {
    alert('A widget with this ID already exists');
    renderProperties();
    return;
  }

  try {
    const response = await fetch('/api/update-widget-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internalId,
        oldWidgetId,
        newWidgetId: newWidgetId || null
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update local metadata
      if (result.metadata) {
        metadata = result.metadata;
      }

      renderWidgetTree();
      renderProperties();
      renderPreview();
      applyStylesToPreview();

      console.log('Widget ID updated successfully');
    } else {
      alert('Error updating widget ID: ' + result.error);
      renderProperties();
    }
  } catch (error) {
    console.error('Error updating widget ID:', error);
    alert('Error updating widget ID: ' + error.message);
    renderProperties();
  }
}

// Update property
async function updateProperty(widgetId, propertyName, newValue, valueType) {
  try {
    // Convert value based on type
    let convertedValue = newValue;
    if (valueType === 'number') {
      // Allow empty strings to clear the property
      if (newValue === '' || newValue === null || newValue === undefined) {
        convertedValue = undefined;
      } else {
        convertedValue = parseFloat(newValue);
        if (isNaN(convertedValue)) {
          alert('Invalid number value');
          return;
        }
      }
    } else if (valueType === 'boolean') {
      convertedValue = Boolean(newValue);
    } else if (valueType === 'string') {
      // Keep empty strings as empty strings
      convertedValue = String(newValue);
    }

    const response = await fetch('/api/update-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId,
        propertyName,
        newValue: convertedValue
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update local metadata from server response (if provided)
      if (result.metadata) {
        metadata = result.metadata;
      } else {
        // Fallback: update manually (for backward compatibility)
        const widget = metadata.widgets.find(w => w.id === widgetId);
        if (widget) {
          widget.properties[propertyName] = convertedValue;
        }
      }

      // Update current source with the edited source
      if (result.currentSource) {
        currentSource = result.currentSource;
      }

      renderWidgetTree();
      renderPreview();
      applyStylesToPreview();

      // Re-render Source tab if it's currently active
      const sourceTab = document.getElementById('previewTabSource');
      if (sourceTab && sourceTab.classList.contains('active')) {
        renderSourceTab();
      }

      console.log('Property updated successfully');
    } else {
      alert('Error updating property: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating property:', error);
    alert('Error updating property: ' + error.message);
  }
}

// Update accessibility property
async function updateAccessibility(widgetId, propertyName, newValue) {
  try {
    // Find the widget in metadata
    const widget = metadata.widgets.find(w => w.id === widgetId);
    if (!widget) {
      console.error('Widget not found:', widgetId);
      return;
    }

    // Get current accessibility object or create new one
    const accessibility = widget.accessibility ? { ...widget.accessibility } : {};

    // Trim the value
    const trimmedValue = String(newValue).trim();

    // Update the specific property (or remove it if empty)
    if (trimmedValue) {
      accessibility[propertyName] = trimmedValue;
    } else {
      delete accessibility[propertyName];
    }

    // Send the full accessibility object to backend
    const response = await fetch('/api/update-accessibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId,
        accessibility  // Send full accessibility object
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update local metadata from server response
      if (result.metadata) {
        metadata = result.metadata;
      }

      // Update current source with the edited source
      if (result.currentSource) {
        currentSource = result.currentSource;
      }

      renderWidgetTree();
      renderPreview();
      applyStylesToPreview();
      renderProperties();  // Re-render to show updated values

      // Re-render Source tab if it's currently active
      const sourceTab = document.getElementById('previewTabSource');
      if (sourceTab && sourceTab.classList.contains('active')) {
        renderSourceTab();
      }

      console.log('Accessibility property updated successfully');
    } else {
      alert('Error updating accessibility: ' + result.error);
      renderProperties();  // Re-render to revert to previous values
    }
  } catch (error) {
    console.error('Error updating accessibility:', error);
    alert('Error updating accessibility: ' + error.message);
    renderProperties();  // Re-render to revert to previous values
  }
}

// Save changes
async function saveChanges() {
  try {
    const response = await fetch('/api/save', {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      // Update current source with the saved (transformed) source
      if (result.content) {
        currentSource = result.content;
      }
      alert('Changes saved successfully to: ' + result.outputPath);
    } else {
      alert('Error saving: ' + result.error);
    }
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving: ' + error.message);
  }
}

// Apply styles to preview
function applyStylesToPreview() {
  if (!currentStyles) return;

  // Remove existing style tag if any
  const existingStyle = document.getElementById('previewStyles');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style tag
  const styleTag = document.createElement('style');
  styleTag.id = 'previewStyles';

  // Convert camelCase to kebab-case
  const camelToKebab = (str) => {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  };

  // Convert Fyne-specific properties to CSS
  const fyneToCSS = (prop, value) => {
    // Handle Fyne-specific boolean properties
    if (prop === 'bold' && value === true) {
      return { prop: 'font-weight', value: 'bold' };
    }
    if (prop === 'italic' && value === true) {
      return { prop: 'font-style', value: 'italic' };
    }
    if (prop === 'monospace' && value === true) {
      return { prop: 'font-family', value: 'monospace' };
    }

    // Handle numeric properties that need units
    if (prop === 'fontSize' && typeof value === 'number') {
      return { prop: 'font-size', value: `${value}px` };
    }
    if (prop === 'padding' && typeof value === 'number') {
      return { prop: 'padding', value: `${value}px` };
    }
    if (prop === 'margin' && typeof value === 'number') {
      return { prop: 'margin', value: `${value}px` };
    }

    // Handle color properties (pass through)
    if (prop === 'color' || prop === 'backgroundColor') {
      return { prop: camelToKebab(prop), value };
    }

    // Default: convert camelCase to kebab-case and pass through
    return { prop: camelToKebab(prop), value };
  };

  // Generate CSS
  // Make selectors more specific to override production mode styles
  let cssText = '';
  for (const [className, properties] of Object.entries(currentStyles)) {
    // Add specificity for both normal and production mode
    cssText += `.preview-widget.${className}, .preview-content.production-mode .preview-widget.${className} {\n`;
    for (const [prop, value] of Object.entries(properties)) {
      const converted = fyneToCSS(prop, value);
      if (converted) {
        cssText += `  ${converted.prop}: ${converted.value};\n`;
      }
    }
    cssText += '}\n\n';
  }

  styleTag.textContent = cssText;
  document.head.appendChild(styleTag);

  console.log('[Preview] Applied styles:', cssText);
}

// Refresh preview
function refreshPreview() {
  renderPreview();
  applyStylesToPreview();
}

// Render preview
function renderPreview() {
  const content = document.getElementById('previewContent');

  if (!metadata || !metadata.widgets) {
    content.innerHTML = '<div class="no-selection">No widgets to preview</div>';
    return;
  }

  // Find root widgets
  const rootWidgets = metadata.widgets.filter(w => !w.parent);

  content.innerHTML = '';
  rootWidgets.forEach(widget => {
    content.appendChild(createPreviewWidget(widget));
  });
}

// Create preview widget element
function createPreviewWidget(widget) {
  const element = document.createElement('div');
  element.className = 'preview-widget';
  element.dataset.widgetId = widget.id;

  // Apply CSS class if widget has className property
  if (widget.properties && widget.properties.className) {
    element.classList.add(widget.properties.className);
  }

  // Build tooltip text
  let tooltipParts = [];
  tooltipParts.push(`Type: ${widget.widgetType}`);
  if (widget.widgetId) {
    tooltipParts.push(`ID: ${widget.widgetId}`);
  }
  if (widget.properties && widget.properties.className) {
    tooltipParts.push(`Class: ${widget.properties.className}`);
  }
  if (widget.properties && Object.keys(widget.properties).length > 0) {
    const propsList = Object.entries(widget.properties)
      .filter(([key, val]) => val !== undefined && val !== null && val !== '')
      .map(([key, val]) => {
        const valStr = typeof val === 'string' && val.length > 30
          ? val.substring(0, 30) + '...'
          : String(val);
        return `${key}: ${valStr}`;
      })
      .slice(0, 3); // Show max 3 properties in tooltip
    if (propsList.length > 0) {
      tooltipParts.push('---');
      tooltipParts.push(...propsList);
    }
  }
  element.title = tooltipParts.join('\n');

  // Add click handler to select widget
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWidget(widget.id);
  });

  // Add right-click context menu to preview (same as tree)
  element.addEventListener('contextmenu', (e) => {
    e.stopPropagation();
    showContextMenu(e, widget);
  });

  // Add visual highlight if selected
  if (selectedWidgetId === widget.id) {
    element.style.outline = '2px solid #0e639c';
    element.style.outlineOffset = '2px';
  }

  const containerTypes = [
    'vbox', 'hbox', 'window', 'scroll', 'grid', 'gridwrap', 'center',
    'hsplit', 'vsplit', 'tabs', 'card', 'accordion', 'form', 'border',
    'padded', 'clip', 'innerWindow', 'adaptivegrid'
  ];
  const isContainer = containerTypes.includes(widget.widgetType);
  if (isContainer) {
    element.classList.add('container');
  }

  // Helper to render children with proper layout
  const renderChildren = (layoutStyle = {}) => {
    const children = metadata.widgets.filter(w => w.parent === widget.id);
    if (children.length > 0) {
      const childContainer = document.createElement('div');

      // Apply layout styles
      Object.assign(childContainer.style, layoutStyle);

      children.forEach(child => {
        childContainer.appendChild(createPreviewWidget(child));
      });
      element.appendChild(childContainer);
    }
  };

  switch (widget.widgetType) {
    // Display widgets
    case 'label':
      element.classList.add('preview-label');
      element.style.padding = '4px 8px';
      element.textContent = widget.properties.text || 'Label';
      break;

    case 'hyperlink':
      element.style.padding = '4px 8px';
      element.innerHTML = `<a href="#" style="color: #4ec9b0; text-decoration: underline;">${widget.properties.text || 'Link'}</a>`;
      break;

    case 'separator':
      element.style.border = 'none';
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.innerHTML = `<hr style="border: none; border-top: 1px solid #5e5e5e; margin: 4px 0; width: 100%;">`;
      break;

    case 'spacer':
      element.style.border = 'none';
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.flex = '1';
      element.style.minHeight = '8px';
      element.innerHTML = `<div style="height: 100%; min-height: 8px; background: repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px);"></div>`;
      break;

    case 'richtext':
      element.style.padding = '4px 8px';
      element.innerHTML = `<div style="color: #d4d4d4; font-style: italic;">${widget.properties.text || 'Rich text'}</div>`;
      break;

    case 'image':
      element.style.padding = '8px';
      element.innerHTML = `<div style="background: #3c3c3c; padding: 20px; text-align: center; border: 1px solid #5e5e5e; border-radius: 3px;">⛶ Image: ${widget.properties.path || widget.properties.resource || 'none'}</div>`;
      break;

    // Input widgets
    case 'button':
      element.classList.add('preview-button');
      element.style.flexShrink = '0';
      element.textContent = widget.properties.text || 'Button';
      break;

    case 'entry':
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.border = 'none';
      element.innerHTML = `<input type="text" placeholder="${widget.properties.placeholder || ''}" style="min-width: ${widget.properties.minWidth || 150}px; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 3px;">`;
      break;

    case 'multilineentry':
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.border = 'none';
      element.innerHTML = `<textarea placeholder="${widget.properties.placeholder || ''}" style="width: 100%; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 3px; min-height: 60px;"></textarea>`;
      break;

    case 'passwordentry':
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.border = 'none';
      element.innerHTML = `<input type="password" placeholder="${widget.properties.placeholder || ''}" style="min-width: 150px; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 3px;">`;
      break;

    case 'checkbox':
      element.style.padding = '4px 8px';
      element.innerHTML = `<label style="color: #d4d4d4; display: flex; align-items: center; white-space: nowrap;"><input type="checkbox" style="margin-right: 6px;">${widget.properties.text || 'Checkbox'}</label>`;
      break;

    case 'select':
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.border = 'none';
      element.innerHTML = `<select style="min-width: 150px; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 3px;"><option>${widget.properties.options || 'Options'}</option></select>`;
      break;

    case 'radiogroup':
      element.style.padding = '4px 8px';
      element.innerHTML = `<div style="color: #858585;">Radio: ${widget.properties.options || 'Options'}</div>`;
      break;

    case 'slider':
      element.style.padding = '4px 8px';
      element.innerHTML = `<input type="range" min="${widget.properties.min || 0}" max="${widget.properties.max || 100}" value="${widget.properties.initialValue || 50}" style="min-width: 150px;">`;
      break;

    case 'progressbar':
      element.style.padding = '4px 8px';
      element.innerHTML = `<div style="background: #3c3c3c; border-radius: 3px; overflow: hidden; min-width: 150px;"><div style="background: #0e639c; height: 10px; width: ${widget.properties.initialValue || 50}%;"></div></div>`;
      break;

    // Data widgets
    case 'table':
      element.innerHTML = `<div style="color: #858585; font-size: 11px;">Table: ${widget.properties.headers || ''} (${widget.properties.rows || 0} rows)</div>`;
      break;

    case 'list':
      element.innerHTML = `<div style="color: #858585; font-size: 11px;">List: ${widget.properties.items || 'Items'}</div>`;
      break;

    case 'tree':
      element.innerHTML = `<div style="color: #858585; font-size: 11px;">Tree: ${widget.properties.rootLabel || 'Root'}</div>`;
      break;

    case 'toolbar':
      element.innerHTML = `<div style="background: #2d2d2d; padding: 6px; border-radius: 3px; color: #858585; font-size: 11px;">Toolbar: ${widget.properties.items || 'Actions'}</div>`;
      break;

    // Container widgets
    case 'vbox':
      element.innerHTML = `<div class="container-label" style="color: #858585; font-size: 11px; margin-bottom: 5px;">vbox</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'hbox':
      element.innerHTML = `<div class="container-label" style="color: #858585; font-size: 11px; margin-bottom: 5px;">hbox</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px',
        alignItems: 'flex-start'
      });
      break;

    case 'grid':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">grid (${widget.properties.columns || 2} cols)</div>`;
      renderChildren({
        display: 'grid',
        gridTemplateColumns: `repeat(${widget.properties.columns || 2}, 1fr)`,
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'scroll':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">scroll</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px',
        maxHeight: '200px',
        overflow: 'auto'
      });
      break;

    case 'center':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">center</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px',
        alignItems: 'center',
        justifyContent: 'center'
      });
      break;

    case 'gridwrap':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">gridwrap</div>`;
      renderChildren({
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'hsplit':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">hsplit</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'row',
        gap: '4px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'vsplit':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">vsplit</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'border':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">border${widget.properties.regions ? ` (${widget.properties.regions})` : ''}</div>`;
      renderChildren({
        display: 'grid',
        gridTemplateAreas: '"top" "center" "bottom"',
        gridTemplateRows: 'auto 1fr auto',
        gap: '4px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'window':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">window${widget.properties.title ? `: ${widget.properties.title}` : ''}</div>`;
      // Apply width from window properties, but let height be content-driven
      // with scrollbar if content is very tall
      const windowStyles = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '2px solid #0e639c',
        borderRadius: '5px',
        background: '#171718', // Fyne dark background
        maxHeight: '80vh', // Cap at 80% viewport height
        overflowY: 'auto' // Scroll if content exceeds max-height
      };
      if (widget.properties.width) {
        windowStyles.width = widget.properties.width + 'px';
        windowStyles.flexShrink = '0';
      }
      // Use minHeight from properties as a hint, but allow growth
      if (widget.properties.height) {
        windowStyles.minHeight = widget.properties.height + 'px';
      }
      renderChildren(windowStyles);
      break;

    case 'tabs':
      // Get tab children
      const tabChildren = metadata.widgets.filter(w => w.parent === widget.id);
      const tabTitlesStr = widget.properties?.tabTitles || '';
      const tabTitles = tabTitlesStr ? tabTitlesStr.split(',').map(t => t.trim()) : [];

      // Ensure we have enough titles
      while (tabTitles.length < tabChildren.length) {
        tabTitles.push(`Tab ${tabTitles.length + 1}`);
      }

      // Get selected tab (default to 0)
      const selectedTabIndex = selectedTabs[widget.id] ?? 0;

      // Create tab header container
      const tabHeader = document.createElement('div');
      tabHeader.style.cssText = 'display: flex; gap: 0; border-bottom: 1px solid #5e5e5e; margin-bottom: 8px;';

      // Create tab buttons - show all specified titles, or at least match children count
      const tabCount = Math.max(tabTitles.length, tabChildren.length, 1);
      tabTitles.slice(0, tabCount).forEach((title, index) => {
        const tabBtn = document.createElement('div');
        const isSelected = index === selectedTabIndex;
        tabBtn.style.cssText = `
          padding: 8px 16px;
          cursor: pointer;
          color: ${isSelected ? '#fff' : '#858585'};
          border-bottom: 2px solid ${isSelected ? '#0e639c' : 'transparent'};
          margin-bottom: -1px;
          transition: all 0.2s;
          font-size: 12px;
        `;
        tabBtn.textContent = title;
        tabBtn.onmouseenter = () => { if (!isSelected) tabBtn.style.color = '#d4d4d4'; };
        tabBtn.onmouseleave = () => { if (!isSelected) tabBtn.style.color = '#858585'; };
        tabBtn.onclick = (e) => {
          e.stopPropagation();
          selectedTabs[widget.id] = index;
          renderPreview();
          applyStylesToPreview();
        };
        tabHeader.appendChild(tabBtn);
      });

      element.appendChild(tabHeader);

      // Create tab content container - only show selected tab's children
      const tabContent = document.createElement('div');
      tabContent.style.cssText = 'padding: 8px; border: 1px dashed #5e5e5e; border-radius: 3px;';

      if (tabChildren.length > 0 && tabChildren[selectedTabIndex]) {
        tabContent.appendChild(createPreviewWidget(tabChildren[selectedTabIndex]));
      } else if (tabChildren.length === 0) {
        tabContent.innerHTML = '<div style="color: #858585; font-size: 11px; font-style: italic;">No tab content</div>';
      }

      element.appendChild(tabContent);
      break;

    case 'card':
      element.innerHTML = `<div style="border: 1px solid #5e5e5e; border-radius: 3px; padding: 10px; margin-bottom: 5px;"><div style="font-weight: bold; color: #d4d4d4;">${widget.properties.title || 'Card'}</div><div style="color: #858585; font-size: 11px;">${widget.properties.subtitle || ''}</div></div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingTop: '8px'
      });
      break;

    case 'accordion':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">accordion: ${widget.properties.items || 'Items'}</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'form':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">form: ${widget.properties.fields || 'Fields'}</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'padded':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">padded</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'clip':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">clip</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px',
        overflow: 'hidden'
      });
      break;

    case 'innerWindow':
      element.innerHTML = `<div style="background: #2d2d2d; padding: 4px 8px; border-radius: 3px 3px 0 0; font-size: 11px; color: #d4d4d4; display: flex; justify-content: space-between; align-items: center;"><span>${widget.properties?.title || 'Inner Window'}</span><span style="color: #858585;">✕</span></div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px solid #5e5e5e',
        borderTop: 'none',
        borderRadius: '0 0 3px 3px',
        background: '#1e1e1e'
      });
      break;

    case 'adaptivegrid':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">adaptivegrid (${widget.properties?.rowcols || 2})</div>`;
      renderChildren({
        display: 'grid',
        gridTemplateColumns: `repeat(${widget.properties?.rowcols || 2}, 1fr)`,
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
      break;

    case 'activity':
      element.style.padding = '8px';
      element.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><div style="width: 20px; height: 20px; border: 2px solid #0e639c; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><span style="color: #858585; font-size: 11px;">Loading...</span></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
      break;

    case 'selectentry':
      element.style.padding = '0';
      element.style.background = 'transparent';
      element.style.border = 'none';
      element.innerHTML = `<div style="display: flex;"><input type="text" placeholder="${widget.properties?.placeholder || ''}" style="min-width: 100px; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; border-right: none; color: #d4d4d4; border-radius: 3px 0 0 3px;"><select style="padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 0 3px 3px 0;"><option>▼</option></select></div>`;
      break;

    // Canvas primitives
    case 'rectangle':
      element.style.padding = '0';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const rectColor = widget.properties?.color || '#3c3c3c';
      const rectWidth = widget.properties?.width ? `${widget.properties.width}px` : '60px';
      const rectHeight = widget.properties?.height ? `${widget.properties.height}px` : '40px';
      element.innerHTML = `<div style="width: ${rectWidth}; height: ${rectHeight}; background: ${rectColor}; border-radius: 2px;"></div>`;
      break;

    case 'circle':
      element.style.padding = '0';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const circleColor = widget.properties?.color || '#3c3c3c';
      const circleSize = widget.properties?.radius ? `${widget.properties.radius * 2}px` : '40px';
      element.innerHTML = `<div style="width: ${circleSize}; height: ${circleSize}; background: ${circleColor}; border-radius: 50%;"></div>`;
      break;

    case 'line':
      element.style.padding = '4px 0';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const lineColor = widget.properties?.color || '#5e5e5e';
      const lineWidth = widget.properties?.strokeWidth || 2;
      element.innerHTML = `<div style="height: ${lineWidth}px; background: ${lineColor}; width: 100%;"></div>`;
      break;

    case 'linearGradient':
      element.style.padding = '0';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const lgStart = widget.properties?.startColor || '#0e639c';
      const lgEnd = widget.properties?.endColor || '#3c3c3c';
      const lgAngle = widget.properties?.angle || 0;
      element.innerHTML = `<div style="width: 60px; height: 40px; background: linear-gradient(${lgAngle}deg, ${lgStart}, ${lgEnd}); border-radius: 2px;"></div>`;
      break;

    case 'radialGradient':
      element.style.padding = '0';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const rgCenter = widget.properties?.centerColor || '#0e639c';
      const rgEdge = widget.properties?.edgeColor || '#3c3c3c';
      element.innerHTML = `<div style="width: 50px; height: 50px; background: radial-gradient(circle, ${rgCenter}, ${rgEdge}); border-radius: 2px;"></div>`;
      break;

    case 'text':
      element.style.padding = '4px';
      element.style.border = 'none';
      element.style.background = 'transparent';
      const textContent = widget.properties?.content || 'Text';
      const textSize = widget.properties?.size ? `${widget.properties.size}px` : '14px';
      const textColor = widget.properties?.color || '#d4d4d4';
      element.innerHTML = `<span style="font-size: ${textSize}; color: ${textColor};">${escapeHtml(textContent)}</span>`;
      break;

    default:
      element.textContent = `${widget.widgetType}`;
      element.style.color = '#858585';
  }

  return element;
}

// Utility: escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add widget
async function addWidget(widgetType) {
  if (!selectedWidgetId) {
    alert('Please select a parent widget first (must be a container like vbox, hbox, etc.)');
    return;
  }

  try {
    const response = await fetch('/api/add-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: selectedWidgetId,
        widgetType
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update metadata from server response (don't reload file!)
      if (result.metadata) {
        metadata = result.metadata;
      }
      renderWidgetTree();
      renderPreview();
      applyStylesToPreview();
      renderProperties();
      console.log('Widget added successfully');
    } else {
      alert('Error adding widget: ' + result.error);
    }
  } catch (error) {
    console.error('Error adding widget:', error);
    alert('Error adding widget: ' + error.message);
  }
}

// Delete widget
async function deleteWidget(widgetId) {
  if (!confirm('Are you sure you want to delete this widget?')) {
    return;
  }

  try {
    const response = await fetch('/api/delete-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetId })
    });

    const result = await response.json();

    if (result.success) {
      // Clear selection and reload
      selectedWidgetId = null;
      await loadFile();
      console.log('Widget deleted successfully');
    } else {
      alert('Error deleting widget: ' + result.error);
    }
  } catch (error) {
    console.error('Error deleting widget:', error);
    alert('Error deleting widget: ' + error.message);
  }
}

// Duplicate selected widget
async function duplicateWidget(widgetId) {
  if (!widgetId) {
    alert('No widget selected to duplicate');
    return;
  }

  try {
    const response = await fetch('/api/duplicate-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetId })
    });

    const result = await response.json();

    if (result.success) {
      // Reload to show duplicated widget
      await loadFile();
      // Select the newly created widget
      if (result.newWidgetId) {
        selectWidget(result.newWidgetId);
      }
      console.log('Widget duplicated successfully');
    } else {
      alert('Error duplicating widget: ' + result.error);
    }
  } catch (error) {
    console.error('Error duplicating widget:', error);
    alert('Error duplicating widget: ' + error.message);
  }
}

// Command pattern for undo/redo
class Command {
  constructor(execute, undo, description) {
    this.execute = execute;
    this.undo = undo;
    this.description = description;
  }
}

// Add command to history
function addCommand(command) {
  // Clear any commands after current index (when doing new action after undo)
  commandHistory = commandHistory.slice(0, historyIndex + 1);

  // Add new command
  commandHistory.push(command);
  historyIndex++;

  // Keep history within limit
  if (commandHistory.length > MAX_HISTORY) {
    commandHistory.shift();
    historyIndex--;
  }

  console.log(`[History] Added command: ${command.description} (${historyIndex + 1}/${commandHistory.length})`);
  updateMenuState();
}

// Undo last command
async function undo() {
  if (historyIndex < 0) {
    console.log('[History] Nothing to undo');
    return;
  }

  const command = commandHistory[historyIndex];
  console.log(`[History] Undoing: ${command.description}`);

  try {
    await command.undo();
    historyIndex--;
    await loadFile(); // Reload to reflect changes
    updateMenuState();
  } catch (error) {
    console.error('[History] Undo failed:', error);
    alert('Undo failed: ' + error.message);
  }
}

// Redo next command
async function redo() {
  if (historyIndex >= commandHistory.length - 1) {
    console.log('[History] Nothing to redo');
    return;
  }

  const command = commandHistory[historyIndex + 1];
  console.log(`[History] Redoing: ${command.description}`);

  try {
    await command.execute();
    historyIndex++;
    await loadFile(); // Reload to reflect changes
    updateMenuState();
  } catch (error) {
    console.error('[History] Redo failed:', error);
    alert('Redo failed: ' + error.message);
  }
}

// Update menu button states
function updateMenuState() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  if (undoBtn) {
    undoBtn.disabled = historyIndex < 0;
    undoBtn.title = historyIndex >= 0
      ? `Undo: ${commandHistory[historyIndex].description} (Ctrl+Z)`
      : 'Nothing to undo (Ctrl+Z)';
  }

  if (redoBtn) {
    redoBtn.disabled = historyIndex >= commandHistory.length - 1;
    redoBtn.title = historyIndex < commandHistory.length - 1
      ? `Redo: ${commandHistory[historyIndex + 1].description} (Ctrl+Y)`
      : 'Nothing to redo (Ctrl+Y)';
  }
}

// Global keyboard shortcuts handler
function handleKeyboardShortcut(e) {
  // Check for modifier keys
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  // Ignore shortcuts when typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    // Except for Ctrl+S which should work everywhere
    if (cmdOrCtrl && e.key === 's') {
      e.preventDefault();
      saveChanges();
      return;
    }
    return;
  }

  // Ctrl+Z or Cmd+Z: Undo
  if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return;
  }

  // Ctrl+Y or Cmd+Shift+Z: Redo
  if ((cmdOrCtrl && e.key === 'y') || (cmdOrCtrl && e.shiftKey && e.key === 'z')) {
    e.preventDefault();
    redo();
    return;
  }

  // Ctrl+S or Cmd+S: Save
  if (cmdOrCtrl && e.key === 's') {
    e.preventDefault();
    saveChanges();
    return;
  }

  // Ctrl+D or Cmd+D: Duplicate
  if (cmdOrCtrl && e.key === 'd') {
    e.preventDefault();
    if (selectedWidgetId) {
      duplicateWidget(selectedWidgetId);
    } else {
      alert('No widget selected to duplicate');
    }
    return;
  }

  // Delete or Backspace: Delete selected widget
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWidgetId) {
    e.preventDefault();
    deleteWidget(selectedWidgetId);
    return;
  }

  // Ctrl+F or Cmd+F: Find
  if (cmdOrCtrl && e.key === 'f') {
    e.preventDefault();
    openFindModal();
    return;
  }
}

// Find/Search functionality
function openFindModal() {
  const modal = document.getElementById('findModal');
  modal.classList.add('visible');

  // Focus the search input
  setTimeout(() => {
    const input = document.getElementById('findInput');
    input.focus();
    input.select();
  }, 100);

  console.log('[Find] Search dialog opened');
}

function closeFindModal() {
  const modal = document.getElementById('findModal');
  modal.classList.remove('visible');

  // Clear matches and re-render tree to remove indicators
  matchedWidgetIds.clear();
  renderWidgetTree();

  // Clear highlights from preview
  clearFindHighlights();

  console.log('[Find] Search dialog closed');
}

function performSearch() {
  const searchTerm = document.getElementById('findInput').value.trim();
  const findInWidgets = document.getElementById('findInWidgets').checked;
  const findInSource = document.getElementById('findInSource').checked;
  const caseSensitive = document.getElementById('findCaseSensitive').checked;

  if (!searchTerm) {
    alert('Please enter a search term');
    return;
  }

  console.log(`[Find] Searching for: "${searchTerm}" (widgets: ${findInWidgets}, source: ${findInSource}, caseSensitive: ${caseSensitive})`);

  findResults = [];
  currentFindIndex = -1;
  matchedWidgetIds.clear(); // Clear previous matches

  const searchTermLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  // Search in widgets
  if (findInWidgets && metadata && metadata.widgets) {
    metadata.widgets.forEach(widget => {
      const matches = [];

      // Check widget type
      const widgetType = caseSensitive ? widget.widgetType : widget.widgetType.toLowerCase();
      if (widgetType.includes(searchTermLower)) {
        matches.push({ field: 'type', value: widget.widgetType, priority: 1 });
      }

      // Check widget ID (high priority)
      if (widget.widgetId) {
        const widgetId = caseSensitive ? widget.widgetId : widget.widgetId.toLowerCase();
        if (widgetId.includes(searchTermLower)) {
          matches.push({ field: 'ID', value: widget.widgetId, priority: 3 });
        }
      }

      // Check properties with special attention to text and className
      if (widget.properties) {
        // Prioritize text property
        if (widget.properties.text !== undefined && widget.properties.text !== null) {
          const text = caseSensitive ? String(widget.properties.text) : String(widget.properties.text).toLowerCase();
          if (text.includes(searchTermLower)) {
            matches.push({ field: 'text', value: widget.properties.text, priority: 3 });
          }
        }

        // Prioritize className property
        if (widget.properties.className) {
          const className = caseSensitive ? widget.properties.className : widget.properties.className.toLowerCase();
          if (className.includes(searchTermLower)) {
            matches.push({ field: 'className', value: widget.properties.className, priority: 3 });
          }
        }

        // Check other properties
        Object.entries(widget.properties).forEach(([key, value]) => {
          // Skip text and className as we already checked them
          if (key === 'text' || key === 'className') return;

          const valueStr = caseSensitive ? String(value) : String(value).toLowerCase();
          if (valueStr.includes(searchTermLower)) {
            matches.push({ field: key, value: value, priority: 2 });
          }
        });
      }

      if (matches.length > 0) {
        // Sort matches by priority (highest first)
        matches.sort((a, b) => b.priority - a.priority);

        // Track this widget as matched for tree highlighting
        matchedWidgetIds.add(widget.id);

        findResults.push({
          type: 'widget',
          widget: widget,
          matches: matches,
          matchCount: matches.length,
          description: `${widget.widgetType}${widget.widgetId ? ' #' + widget.widgetId : ''}`
        });
      }
    });
  }

  // Search in source code
  if (findInSource && currentSource) {
    const lines = currentSource.split('\n');
    lines.forEach((line, index) => {
      const lineToSearch = caseSensitive ? line : line.toLowerCase();
      if (lineToSearch.includes(searchTermLower)) {
        findResults.push({
          type: 'source',
          lineNumber: index + 1,
          lineContent: line.trim(),
          description: `Line ${index + 1}`
        });
      }
    });
  }

  // Display results
  displayFindResults();

  // Re-render tree to show match indicators
  renderWidgetTree();

  console.log(`[Find] Found ${findResults.length} results`);
}

function displayFindResults() {
  const resultsContainer = document.getElementById('findResults');
  const navigationDiv = document.getElementById('findNavigation');

  if (findResults.length === 0) {
    resultsContainer.innerHTML = '<div style="color: #858585; font-size: 12px; text-align: center; padding: 20px;">No results found</div>';
    navigationDiv.style.display = 'none';
    return;
  }

  let html = '<div style="font-size: 12px;">';

  findResults.forEach((result, index) => {
    const isActive = index === currentFindIndex;
    const bgColor = isActive ? '#094771' : 'transparent';

    if (result.type === 'widget') {
      const matchesHtml = result.matches.map(m => {
        const color = m.priority === 3 ? '#4ec9b0' : '#858585'; // Highlight text, ID, className
        const icon = m.priority === 3 ? '⭐' : '•';
        return `<div style="color: ${color};">${icon} <strong>${m.field}:</strong> ${escapeHtml(String(m.value))}</div>`;
      }).join('');

      const matchBadge = result.matchCount > 1 ? `<span style="background: #0e639c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">${result.matchCount} matches</span>` : '';

      html += `
        <div style="padding: 10px; margin-bottom: 8px; background: ${bgColor}; border: 1px solid #3e3e3e; border-radius: 3px; cursor: pointer;"
             onclick="selectFindResult(${index})">
          <div style="color: #4ec9b0; font-weight: 600; margin-bottom: 6px;">
            ${result.description}${matchBadge}
          </div>
          <div style="font-size: 11px;">
            ${matchesHtml}
          </div>
        </div>
      `;
    } else if (result.type === 'source') {
      html += `
        <div style="padding: 10px; margin-bottom: 8px; background: ${bgColor}; border: 1px solid #3e3e3e; border-radius: 3px; cursor: pointer;"
             onclick="selectFindResult(${index})">
          <div style="color: #dcdcaa; font-weight: 600; margin-bottom: 4px;">${result.description}</div>
          <div style="color: #d4d4d4; font-size: 11px; font-family: 'Consolas', 'Monaco', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(result.lineContent)}
          </div>
        </div>
      `;
    }
  });

  html += '</div>';
  resultsContainer.innerHTML = html;

  // Show navigation
  navigationDiv.style.display = 'flex';
  updateFindCounter();
}

function selectFindResult(index) {
  currentFindIndex = index;
  const result = findResults[index];

  console.log(`[Find] Selected result ${index + 1}/${findResults.length}:`, result);

  if (result.type === 'widget') {
    // Switch to preview tab
    switchPreviewTab('preview');

    // Select the widget
    selectWidget(result.widget.id);

    // Scroll widget into view if possible
    const widgetElement = document.querySelector(`[data-widget-id="${result.widget.id}"]`);
    if (widgetElement) {
      widgetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else if (result.type === 'source') {
    // Switch to source tab
    switchPreviewTab('source');

    // Try to scroll to the line (limited support without a code editor)
    // Just switch to source view for now
  }

  // Re-render results to highlight current selection
  displayFindResults();
}

function navigateFindResults(direction) {
  if (findResults.length === 0) return;

  currentFindIndex += direction;

  // Wrap around
  if (currentFindIndex < 0) {
    currentFindIndex = findResults.length - 1;
  } else if (currentFindIndex >= findResults.length) {
    currentFindIndex = 0;
  }

  selectFindResult(currentFindIndex);
}

function updateFindCounter() {
  const counter = document.getElementById('findCounter');
  if (findResults.length > 0) {
    counter.textContent = `Result ${currentFindIndex + 1} of ${findResults.length}`;
  } else {
    counter.textContent = 'No results';
  }
}

function clearFindHighlights() {
  // Clear any highlighting from preview
  // This would be more sophisticated with actual highlight overlays
  console.log('[Find] Cleared highlights');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Reorder widget (drag and drop)
async function reorderWidget(draggedWidgetId, targetWidgetId) {
  const draggedWidget = metadata.widgets.find(w => w.id === draggedWidgetId);
  const targetWidget = metadata.widgets.find(w => w.id === targetWidgetId);

  console.log('[REORDER] Dragged widget:', draggedWidgetId, draggedWidget?.widgetType, draggedWidget?.properties?.text);
  console.log('[REORDER] Target widget:', targetWidgetId, targetWidget?.widgetType, targetWidget?.properties?.text);

  try {
    const response = await fetch('/api/reorder-widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draggedWidgetId,
        targetWidgetId
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update local metadata
      if (result.metadata) {
        metadata = result.metadata;
      }

      // Update current source if provided
      if (result.currentSource) {
        currentSource = result.currentSource;
      }

      renderWidgetTree();
      renderPreview();
      applyStylesToPreview();
      console.log('[REORDER] Widget reordered successfully');
    } else {
      alert('Error reordering widget: ' + result.error);
    }
  } catch (error) {
    console.error('Error reordering widget:', error);
    alert('Error reordering widget: ' + error.message);
  }
}

// CSS Editor Functions

// Get a readable path/identifier for a widget
function getWidgetPath(widget) {
  // If widget has an ID, use it
  if (widget.widgetId) {
    return `#${widget.widgetId} (${widget.widgetType})`;
  }

  // Build a path from root to this widget
  const path = [];
  let current = widget;

  while (current) {
    // Add widget type (and text/title if available for disambiguation)
    let label = current.widgetType;
    if (current.properties) {
      if (current.properties.text && current.properties.text.length <= 20) {
        label += ` "${current.properties.text}"`;
      } else if (current.properties.title && current.properties.title.length <= 20) {
        label += ` "${current.properties.title}"`;
      }
    }
    path.unshift(label);

    // Move to parent
    if (current.parent) {
      current = metadata.widgets.find(w => w.id === current.parent);
    } else {
      current = null;
    }
  }

  return path.join(' > ');
}

// Find all widgets using a specific CSS class
function findWidgetsUsingClass(className) {
  if (!metadata || !metadata.widgets) return [];

  return metadata.widgets.filter(w => {
    return w.properties && w.properties.className === className;
  });
}

function openCssEditor() {
  // Create a working copy of styles for editing
  editingStyles = JSON.parse(JSON.stringify(currentStyles || {}));

  const modal = document.getElementById('cssEditorModal');
  modal.classList.add('visible');
  renderCssEditor();
}

function closeCssEditor() {
  // Discard editing copy (garbage collected)
  editingStyles = null;

  // No need to "revert" - preview should only ever show currentStyles
  const modal = document.getElementById('cssEditorModal');
  modal.classList.remove('visible');
}

function renderCssEditor() {
  const body = document.getElementById('cssEditorBody');

  if (!editingStyles || Object.keys(editingStyles).length === 0) {
    body.innerHTML = '<div class="no-selection">No CSS classes defined</div>';
    return;
  }

  let html = '';

  for (const [className, properties] of Object.entries(editingStyles)) {
    // Find widgets using this class
    const widgetsUsingClass = findWidgetsUsingClass(className);
    const usageInfo = widgetsUsingClass.length > 0
      ? widgetsUsingClass.map(w => `
          <a href="#" onclick="selectWidget('${w.id}'); return false;" style="color: #4ec9b0; text-decoration: none;">
            ${escapeHtml(getWidgetPath(w))}
          </a>
        `).join('<br>')
      : '<span style="color: #858585; font-style: italic;">No widgets using this class</span>';

    html += `
      <div class="css-class-editor" data-class="${className}">
        <div class="css-class-header">
          <div class="css-class-name">.${className}</div>
          <button class="css-class-delete" onclick="deleteClass('${className}')">Delete Class</button>
        </div>
        <div style="margin: 8px 0; padding: 8px; background: #2d2d2d; border-radius: 3px; font-size: 11px;">
          <div style="color: #858585; margin-bottom: 4px;">Used by ${widgetsUsingClass.length} widget${widgetsUsingClass.length !== 1 ? 's' : ''}:</div>
          <div style="color: #d4d4d4; line-height: 1.6;">${usageInfo}</div>
        </div>
        <div class="css-properties" id="props-${className}">
    `;

    for (const [prop, value] of Object.entries(properties)) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      const isColor = isColorProperty(prop);

      html += `
        <div class="css-property-row">
          <input type="text" class="css-property-input" value="${prop}"
                 onchange="updateCssProperty('${className}', '${prop}', 'name', this.value)">
          <div style="display: flex; gap: 8px; align-items: center;">
            ${isColor ? `
              <input type="color" class="css-color-picker" value="${valueStr.startsWith('#') ? valueStr : '#000000'}"
                     onchange="updateCssProperty('${className}', '${prop}', 'value', this.value)">
            ` : ''}
            <input type="text" class="css-property-input" value="${escapeHtml(valueStr)}"
                   onchange="updateCssProperty('${className}', '${prop}', 'value', this.value)"
                   style="flex: 1;">
          </div>
          <button class="css-property-delete" onclick="deleteCssProperty('${className}', '${prop}')">×</button>
        </div>
      `;
    }

    html += `
        </div>
        <button class="add-property-btn" onclick="addCssProperty('${className}')">+ Add Property</button>
      </div>
    `;
  }

  body.innerHTML = html;
}

function updateCssProperty(className, oldPropName, field, newValue) {
  if (!editingStyles || !editingStyles[className]) return;

  if (field === 'name' && oldPropName !== newValue) {
    // Rename property
    const value = editingStyles[className][oldPropName];
    delete editingStyles[className][oldPropName];
    editingStyles[className][newValue] = value;
  } else if (field === 'value') {
    // Update value - try to parse as JSON for numbers/booleans
    try {
      editingStyles[className][oldPropName] = JSON.parse(newValue);
    } catch {
      editingStyles[className][oldPropName] = newValue;
    }
  }

  renderCssEditor();
  // Don't apply to preview yet - wait for Save button
}

function deleteCssProperty(className, propName) {
  if (!editingStyles || !editingStyles[className]) return;
  delete editingStyles[className][propName];
  renderCssEditor();
  // Don't apply to preview yet - wait for Save button
}

function addCssProperty(className) {
  if (!editingStyles || !editingStyles[className]) return;

  // Create a modal dialog with property selection
  const existingModal = document.getElementById('propertyPickerModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'propertyPickerModal';
  modal.className = 'modal-overlay visible';

  let optionsHtml = '';
  for (const [category, props] of Object.entries(knownCssProperties)) {
    optionsHtml += `<optgroup label="${category}">`;
    for (const prop of props) {
      optionsHtml += `<option value="${prop}">${prop}</option>`;
    }
    optionsHtml += `</optgroup>`;
  }

  modal.innerHTML = `
    <div class="modal" style="width: 500px;">
      <div class="modal-header">
        <h2>Add CSS Property</h2>
        <button class="modal-close" onclick="closePropertyPicker()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; color: #d4d4d4; font-size: 13px;">
            Select a property or enter a custom one:
          </label>
          <select id="propertySelect" class="property-input" style="width: 100%; margin-bottom: 10px;"
                  onchange="updatePropertyValueInput()">
            <option value="">-- Select Property --</option>
            ${optionsHtml}
          </select>
          <div style="margin-top: 10px;">
            <label style="display: block; margin-bottom: 8px; color: #d4d4d4; font-size: 13px;">
              Or enter custom property name:
            </label>
            <input type="text" id="customPropertyInput" class="property-input"
                   placeholder="e.g., customProperty" style="width: 100%;"
                   oninput="updatePropertyValueInput()">
          </div>
          <div id="propertyValueSection" style="margin-top: 15px; display: none;">
            <label style="display: block; margin-bottom: 8px; color: #d4d4d4; font-size: 13px;">
              Value:
            </label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="color" id="propertyColorPicker" class="css-color-picker" value="#000000" style="display: none;">
              <input type="text" id="propertyValueInput" class="property-input" placeholder="Enter value" style="flex: 1;">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" onclick="closePropertyPicker()">Cancel</button>
        <button class="btn-save" onclick="confirmAddProperty('${className}')">Add Property</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Focus on select
  setTimeout(() => {
    document.getElementById('propertySelect').focus();
  }, 100);
}

function updatePropertyValueInput() {
  const select = document.getElementById('propertySelect');
  const customInput = document.getElementById('customPropertyInput');
  const valueSection = document.getElementById('propertyValueSection');
  const colorPicker = document.getElementById('propertyColorPicker');
  const valueInput = document.getElementById('propertyValueInput');

  const propName = customInput.value.trim() || select.value;

  if (propName) {
    // Show value section
    valueSection.style.display = 'block';

    // Check if it's a color property
    if (isColorProperty(propName)) {
      colorPicker.style.display = 'block';
      valueInput.value = '#000000';
      // Sync color picker with text input
      colorPicker.addEventListener('input', function() {
        valueInput.value = this.value;
      });
      valueInput.addEventListener('input', function() {
        if (this.value.startsWith('#')) {
          colorPicker.value = this.value;
        }
      });
    } else {
      colorPicker.style.display = 'none';
      valueInput.value = '';
    }
  } else {
    // Hide value section if no property selected
    valueSection.style.display = 'none';
  }
}

function closePropertyPicker() {
  const modal = document.getElementById('propertyPickerModal');
  if (modal) {
    modal.remove();
  }
}

function confirmAddProperty(className) {
  const select = document.getElementById('propertySelect');
  const customInput = document.getElementById('customPropertyInput');
  const valueInput = document.getElementById('propertyValueInput');

  const propName = customInput.value.trim() || select.value;

  if (!propName) {
    alert('Please select or enter a property name');
    return;
  }

  if (editingStyles[className][propName] !== undefined) {
    alert(`Property "${propName}" already exists`);
    return;
  }

  // Get value from input, or use default
  let value = valueInput.value.trim();
  if (!value) {
    // Set default value based on property type
    if (isColorProperty(propName)) {
      value = '#000000';
    } else {
      value = '';
    }
  } else {
    // Try to parse as JSON for numbers/booleans
    try {
      value = JSON.parse(value);
    } catch {
      // Keep as string
    }
  }

  editingStyles[className][propName] = value;
  closePropertyPicker();
  renderCssEditor();
  // Don't apply to preview yet - wait for Save button
}

function deleteClass(className) {
  if (!editingStyles) return;

  if (!confirm(`Delete class "${className}"?`)) return;

  delete editingStyles[className];
  renderCssEditor();
  // Don't apply to preview yet - wait for Save button
}

async function saveCssChanges() {
  try {
    // Copy editing changes to current styles
    currentStyles = JSON.parse(JSON.stringify(editingStyles));

    // Apply to preview now
    applyStylesToPreview();

    // Send to backend
    const response = await fetch('/api/update-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ styles: currentStyles })
    });

    const result = await response.json();

    if (result.success) {
      // Update currentSource with the new CSS class definitions
      if (result.currentSource) {
        currentSource = result.currentSource;
        console.log('CSS classes updated successfully - source tab updated');
      }
      closeCssEditor();
    } else {
      alert('Error updating CSS classes: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating CSS classes:', error);
    alert('Error updating CSS classes: ' + error.message);
  }
}

// Toggle production preview mode
function toggleProductionMode() {
  const previewContent = document.getElementById('previewContent');
  const toggleBtn = document.getElementById('productionModeBtn');

  previewContent.classList.toggle('production-mode');
  toggleBtn.classList.toggle('active');

  const isProductionMode = previewContent.classList.contains('production-mode');
  console.log('[Preview] Production mode:', isProductionMode ? 'ON' : 'OFF');
}

// Auto-load on start
window.addEventListener('DOMContentLoaded', () => {
  console.log('Tsyne WYSIWYG Editor loaded');

  // Register global keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcut);

  // Initialize menu state
  updateMenuState();
});
