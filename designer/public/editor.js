// Visual Editor JavaScript

let metadata = null;
let selectedWidgetId = null;
let currentFilePath = null;

// Context menu state
let contextMenuTarget = null;

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

  // Refresh the UI
  const response = await fetch('/api/load', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: currentFilePath })
  });
  const data = await response.json();
  metadata = data.metadata;
  renderWidgetTree();
  renderPreview();
  renderProperties();
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

// Load file and metadata
async function loadFile() {
  try {
    const response = await fetch('/api/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'examples/hello.ts' })
    });

    const data = await response.json();
    metadata = data.metadata;
    currentFilePath = data.filePath;

    document.getElementById('filePath').textContent = currentFilePath;

    renderWidgetTree();
    renderPreview();

    console.log('Loaded metadata:', metadata);
  } catch (error) {
    console.error('Error loading file:', error);
    alert('Error loading file: ' + error.message);
  }
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

  // Icon based on widget type
  const icon = getWidgetIcon(widget.widgetType);

  // Properties preview
  const propsText = getPropsPreview(widget.properties);

  item.innerHTML = `
    <span class="icon">${icon}</span>
    <span class="widget-type">${widget.widgetType}</span>
    ${propsText ? `<span class="widget-props">${propsText}</span>` : ''}
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
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
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
    // Input widgets
    'button': '▭',
    'label': 'T',
    'entry': '⎕',
    'multilineentry': '▭',
    'passwordentry': '◆',
    'checkbox': '☑',
    'select': '▼',
    'radiogroup': '◉',
    'slider': '◧',
    'progressbar': '▬',
    // Display widgets
    'separator': '─',
    'hyperlink': '⎙',
    'image': '⛶',
    'richtext': '⚑',
    'table': '▦',
    'list': '☰',
    'tree': '⌲',
    'toolbar': '▭'
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
        <span class="property-label">ID</span>
        <div class="property-value">${widget.id}</div>
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

    <div class="property-section">
      <button class="delete-button" onclick="deleteWidget('${widget.id}')">Delete Widget</button>
    </div>
  `;
}

// Render property inputs
function renderPropertyInputs(widget) {
  if (!widget.properties || Object.keys(widget.properties).length === 0) {
    return '<div class="no-selection">No editable properties</div>';
  }

  return Object.entries(widget.properties)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `
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
        return `
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
        return `
          <div class="property-row">
            <span class="property-label">${key}</span>
            <div class="property-value">${JSON.stringify(value)}</div>
          </div>
        `;
      }
    })
    .join('');
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

// Update property
async function updateProperty(widgetId, propertyName, newValue, valueType) {
  try {
    // Convert value based on type
    let convertedValue = newValue;
    if (valueType === 'number') {
      convertedValue = parseFloat(newValue);
      if (isNaN(convertedValue)) {
        alert('Invalid number value');
        return;
      }
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
      // Update local metadata
      const widget = metadata.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.properties[propertyName] = convertedValue;
      }

      renderWidgetTree();
      renderPreview();

      console.log('Property updated successfully');
    } else {
      alert('Error updating property: ' + result.error);
    }
  } catch (error) {
    console.error('Error updating property:', error);
    alert('Error updating property: ' + error.message);
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
      alert('Changes saved successfully to: ' + result.outputPath);
    } else {
      alert('Error saving: ' + result.error);
    }
  } catch (error) {
    console.error('Error saving:', error);
    alert('Error saving: ' + error.message);
  }
}

// Refresh preview
function refreshPreview() {
  renderPreview();
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

  // Add click handler to select widget
  element.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWidget(widget.id);
  });

  // Add visual highlight if selected
  if (selectedWidgetId === widget.id) {
    element.style.outline = '2px solid #0e639c';
    element.style.outlineOffset = '2px';
  }

  const containerTypes = [
    'vbox', 'hbox', 'window', 'scroll', 'grid', 'gridwrap', 'center',
    'hsplit', 'vsplit', 'tabs', 'card', 'accordion', 'form', 'border'
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
      element.className = 'preview-label';
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
      element.className = 'preview-button';
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
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">vbox</div>`;
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
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">hbox</div>`;
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
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '2px solid #0e639c',
        borderRadius: '5px',
        background: '#2d2d2d'
      });
      break;

    case 'tabs':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">tabs: ${widget.properties.tabs || 'Tabs'}</div>`;
      renderChildren({
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        border: '1px dashed #5e5e5e',
        borderRadius: '3px'
      });
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

// Auto-load on start
window.addEventListener('DOMContentLoaded', () => {
  console.log('Tsyne WYSIWYG Editor loaded');
});
