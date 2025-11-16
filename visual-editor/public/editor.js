// Visual Editor JavaScript

let metadata = null;
let selectedWidgetId = null;
let currentFilePath = null;

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
    'window': '□',
    'vbox': '⬍',
    'hbox': '⬌',
    'button': '▭',
    'label': 'T',
    'entry': '⎕',
    'checkbox': '☑',
    'select': '▼'
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
              onchange="updateProperty('${widget.id}', '${key}', this.value)"
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
async function updateProperty(widgetId, propertyName, newValue) {
  try {
    const response = await fetch('/api/update-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId,
        propertyName,
        newValue
      })
    });

    const result = await response.json();

    if (result.success) {
      // Update local metadata
      const widget = metadata.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.properties[propertyName] = newValue;
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

  const isContainer = ['vbox', 'hbox', 'window', 'scroll', 'grid'].includes(widget.widgetType);
  if (isContainer) {
    element.classList.add('container');
  }

  switch (widget.widgetType) {
    case 'label':
      element.className = 'preview-label';
      element.textContent = widget.properties.text || 'Label';
      break;

    case 'button':
      element.className = 'preview-button';
      element.textContent = widget.properties.text || 'Button';
      break;

    case 'entry':
      element.innerHTML = `<input type="text" placeholder="${widget.properties.placeholder || ''}" style="width: 100%; padding: 6px; background: #3c3c3c; border: 1px solid #5e5e5e; color: #d4d4d4; border-radius: 3px;">`;
      break;

    case 'vbox':
    case 'hbox':
    case 'window':
      element.innerHTML = `<div style="color: #858585; font-size: 11px; margin-bottom: 5px;">${widget.widgetType}${widget.properties.title ? `: ${widget.properties.title}` : ''}</div>`;

      // Add children
      const children = metadata.widgets.filter(w => w.parent === widget.id);
      const childContainer = document.createElement('div');
      childContainer.style.paddingLeft = '10px';

      children.forEach(child => {
        childContainer.appendChild(createPreviewWidget(child));
      });

      element.appendChild(childContainer);
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

// Auto-load on start
window.addEventListener('DOMContentLoaded', () => {
  console.log('Tsyne WYSIWYG Editor loaded');
});
