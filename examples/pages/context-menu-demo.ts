// Context Menu Demo Page - Right-click context menus on widgets
// URL: http://localhost:3000/context-menu-demo

const { vbox, label, button, separator } = tsyne;

// Create some todo items with context menus
const todoItems = [
  { id: 1, text: 'Buy milk', done: false },
  { id: 2, text: 'Buy potatoes', done: false },
  { id: 3, text: 'Call dentist', done: true }
];

vbox(() => {
  label('Context Menu Demo - Todo List');
  separator();
  label('');
  label('Right-click on any todo item to see the context menu.');
  label('');

  todoItems.forEach(item => {
    const itemLabel = label(`${item.done ? '✓' : '☐'} ${item.text}`);

    // Add context menu to this label
    itemLabel.setContextMenu([
      {
        label: item.done ? 'Mark Incomplete' : 'Mark Complete',
        onSelected: () => {
          item.done = !item.done;
          console.log(`Toggled "${item.text}" - now ${item.done ? 'done' : 'not done'}`);
          browserContext.reload();
        }
      },
      {
        label: 'Edit',
        onSelected: () => {
          console.log(`Edit "${item.text}"`);
          // In a real app, would show edit dialog
        }
      },
      { isSeparator: true },
      {
        label: 'Delete',
        onSelected: () => {
          console.log(`Delete "${item.text}"`);
          const index = todoItems.findIndex(i => i.id === item.id);
          if (index > -1) {
            todoItems.splice(index, 1);
            browserContext.reload();
          }
        }
      },
      { isSeparator: true },
      {
        label: 'Move Up',
        onSelected: () => {
          const index = todoItems.findIndex(i => i.id === item.id);
          if (index > 0) {
            [todoItems[index - 1], todoItems[index]] = [todoItems[index], todoItems[index - 1]];
            browserContext.reload();
          }
        },
        disabled: todoItems.indexOf(item) === 0
      },
      {
        label: 'Move Down',
        onSelected: () => {
          const index = todoItems.findIndex(i => i.id === item.id);
          if (index < todoItems.length - 1) {
            [todoItems[index], todoItems[index + 1]] = [todoItems[index + 1], todoItems[index]];
            browserContext.reload();
          }
        },
        disabled: todoItems.indexOf(item) === todoItems.length - 1
      }
    ]);
  });

  label('');
  separator();
  label('');
  label('Try right-clicking on:');
  label('  • "Buy potatoes" and select Delete');
  label('  • Any item and select Mark Complete/Incomplete');
  label('  • Any item and select Move Up/Down');
  label('');

  button('Back to Home', () => {
    browserContext.changePage('/');
  });
});
