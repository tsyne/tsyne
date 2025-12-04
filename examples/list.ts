/**
 * List Widget Example
 *
 * Demonstrates creating and updating lists with
 * selection callbacks and dynamic items.
 */

import { app, window, vbox, hbox, label, button, entry, list } from '../src';

let todoList: any;
let statusLabel: any;
let newItemEntry: any;

// Initial todo items
let todos = [
  'Buy groceries',
  'Write documentation',
  'Review pull requests',
  'Update dependencies',
  'Fix bug in authentication'
];

app({ title: 'List Demo' }, () => {
  window({ title: 'List Example', width: 600, height: 500 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('List Widget Example');
        label('');

        // Status label
        statusLabel = label('Todo List - Click an item to select it');
        label('');

        // Create list with selection callback
        todoList = list(todos, (index: number, item: string) => {
          statusLabel.setText(`Selected: "${item}" (index ${index})`);
// console.log(`Selected item at index ${index}: ${item}`);
        });

        label('');
        label('');

        // Add item controls
        label('Add New Item:');
        hbox(() => {
          newItemEntry = entry('Enter new todo item...');
          button('Add').onClick(async () => {
            const newItem = await newItemEntry.getText();
            if (newItem && newItem.trim()) {
              todos.push(newItem);
              await todoList.updateItems(todos);
              await newItemEntry.setText('');
              statusLabel.setText(`Added: "${newItem}" - Total: ${todos.length} items`);
            } else {
              statusLabel.setText('Please enter a todo item');
            }
          });
        });

        label('');

        // List manipulation buttons
        hbox(() => {
          button('Remove Last').onClick(async () => {
            if (todos.length > 0) {
              const removed = todos.pop();
              await todoList.updateItems(todos);
              statusLabel.setText(`Removed: "${removed}" - ${todos.length} items remaining`);
            } else {
              statusLabel.setText('List is empty');
            }
          });

          button('Clear All').onClick(async () => {
            todos = [];
            await todoList.updateItems(todos);
            statusLabel.setText('All items cleared');
          });
        });

        label('');

        hbox(() => {
          button('Sort A-Z').onClick(async () => {
            todos.sort();
            await todoList.updateItems(todos);
            statusLabel.setText('List sorted alphabetically');
          });

          button('Reverse Order').onClick(async () => {
            todos.reverse();
            await todoList.updateItems(todos);
            statusLabel.setText('List order reversed');
          });
        });

        label('');

        // Quick add buttons
        label('Quick Add:');
        hbox(() => {
          button('Add Task 1').onClick(async () => {
            todos.push('Complete project documentation');
            await todoList.updateItems(todos);
            statusLabel.setText(`Added task - Total: ${todos.length} items`);
          });

          button('Add Task 2').onClick(async () => {
            todos.push('Prepare presentation slides');
            await todoList.updateItems(todos);
            statusLabel.setText(`Added task - Total: ${todos.length} items`);
          });

          button('Add Task 3').onClick(async () => {
            todos.push('Schedule team meeting');
            await todoList.updateItems(todos);
            statusLabel.setText(`Added task - Total: ${todos.length} items`);
          });
        });

        label('');

        hbox(() => {
          button('Load Sample Data').onClick(async () => {
            todos = [
              'Buy groceries',
              'Write documentation',
              'Review pull requests',
              'Update dependencies',
              'Fix bug in authentication',
              'Refactor database queries',
              'Add unit tests',
              'Update README',
              'Deploy to production',
              'Monitor server logs'
            ];
            await todoList.updateItems(todos);
            statusLabel.setText(`Loaded ${todos.length} sample items`);
          });

          button('Load Minimal Data').onClick(async () => {
            todos = [
              'Task 1',
              'Task 2',
              'Task 3'
            ];
            await todoList.updateItems(todos);
            statusLabel.setText(`Loaded ${todos.length} items`);
          });
        });
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
