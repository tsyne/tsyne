// Visual Editor JavaScript

let metadata = null;
let selectedWidgetId = null;
let currentFilePath = null;
let currentStyles = null;
let currentSource = null;
let originalSource = null;

// CSS editor state (for staging changes before save)
let editingStyles = null;

// Context menu state
let contextMenuTarget = null;

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
  }
}

// Render source tab
function renderSourceTab() {
  const sourceContent = document.getElementById('sourceContent');
  if (currentSource) {
    sourceContent.textContent = currentSource;
  } else {
    sourceContent.textContent = 'No source available';
  }
}

// Render original source tab
function renderOriginalSourceTab() {
  const originalSourceContent = document.getElementById('originalSourceContent');
  if (originalSource) {
    originalSourceContent.textContent = originalSource;
  } else {
    originalSourceContent.textContent = 'No original source available';
  }
}

// Render diff tab
function renderDiffTab() {
  const diffContent = document.getElementById('diffContent');

  if (!originalSource || !currentSource) {
    diffContent.textContent = 'No changes to display';
    return;
  }

  if (originalSource === currentSource) {
    diffContent.textContent = 'No changes - source matches original';
    return;
  }

  // Simple line-by-line diff
  const originalLines = originalSource.split('\n');
  const currentLines = currentSource.split('\n');

  let diffHtml = '';
  const maxLines = Math.max(originalLines.length, currentLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const currLine = currentLines[i];

    if (origLine === currLine) {
      // Context line (unchanged)
      if (currLine !== undefined) {
        diffHtml += `<span class="diff-line context">  ${escapeHtml(currLine)}</span>\n`;
      }
    } else {
      // Show removed line
      if (origLine !== undefined) {
        diffHtml += `<span class="diff-line removed">- ${escapeHtml(origLine)}</span>\n`;
      }
      // Show added line
      if (currLine !== undefined) {
        diffHtml += `<span class="diff-line added">+ ${escapeHtml(currLine)}</span>\n`;
      }
    }
  }

  diffContent.innerHTML = diffHtml || 'No changes to display';
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

  item.innerHTML = `
    <span class="icon">${icon}</span>
    ${displayText}
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
      console.log('CSS classes updated successfully');
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
});
