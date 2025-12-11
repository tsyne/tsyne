/**
 * Kanban Board - Drag & Drop Demo
 *
 * Demonstrates the Drag & Drop feature:
 * - Draggable task cards
 * - Droppable columns (To Do, In Progress, Done)
 * - Visual feedback during drag operations
 * - Move tasks between columns
 */

import { app } from '../core/src/index';

interface Task {
  id: string;
  title: string;
  column: 'todo' | 'inprogress' | 'done';
}

app({ title: 'Kanban Board' }, (a) => {
  // Sample tasks
  const tasks: Task[] = [
    { id: 'task-1', title: 'Design mockups', column: 'todo' },
    { id: 'task-2', title: 'Set up project', column: 'todo' },
    { id: 'task-3', title: 'Write documentation', column: 'inprogress' },
    { id: 'task-4', title: 'Code review', column: 'done' },
  ];

  let statusLabel: any;
  let todoColumn: any;
  let inProgressColumn: any;
  let doneColumn: any;

  function getTasksForColumn(column: 'todo' | 'inprogress' | 'done'): Task[] {
    return tasks.filter(t => t.column === column);
  }

  function moveTask(taskId: string, toColumn: 'todo' | 'inprogress' | 'done') {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.column !== toColumn) {
      task.column = toColumn;
      statusLabel.setText(`Moved "${task.title}" to ${toColumn}`);
    }
  }

  a.window({ title: 'Kanban Board', width: 900, height: 600 }, (win) => {
    let newTaskEntry: any;

    win.setContent(() => {
      a.vbox(() => {
        a.label('Kanban Board - Drag & Drop Demo', undefined, 'center', undefined, { bold: true });
        a.separator();

        // Add new task section
        a.hbox(() => {
          a.label('New Task:');
          newTaskEntry = a.entry('Enter task title');
          a.button('Add to To Do').onClick(async () => {
            const title = await newTaskEntry.getText();
            if (title) {
              const newTask: Task = {
                id: `task-${Date.now()}`,
                title,
                column: 'todo'
              };
              tasks.push(newTask);
              newTaskEntry.setText('');
              statusLabel.setText(`Added "${title}" to To Do`);
            }
          });
        });

        a.separator();

        // Kanban columns
        a.hbox(() => {
          // To Do Column
          a.vbox(() => {
            a.label('TO DO', undefined, 'center', undefined, { bold: true });
            a.separator();
            todoColumn = a.vbox(() => {
              // Tasks will be rendered here
              for (const task of getTasksForColumn('todo')) {
                createTaskCard(task);
              }
            });
          });

          a.separator();

          // In Progress Column
          a.vbox(() => {
            a.label('IN PROGRESS', undefined, 'center', undefined, { bold: true });
            a.separator();
            inProgressColumn = a.vbox(() => {
              for (const task of getTasksForColumn('inprogress')) {
                createTaskCard(task);
              }
            });
          });

          a.separator();

          // Done Column
          a.vbox(() => {
            a.label('DONE', undefined, 'center', undefined, { bold: true });
            a.separator();
            doneColumn = a.vbox(() => {
              for (const task of getTasksForColumn('done')) {
                createTaskCard(task);
              }
            });
          });
        });

        a.separator();

        // Status bar
        statusLabel = a.label('Drag tasks between columns');

        a.separator();

        // Instructions
        a.label('Instructions:', undefined, 'leading', undefined, { bold: true });
        a.label('1. Drag task cards to move them between columns');
        a.label('2. Use the buttons to manually move tasks');
        a.label('3. Add new tasks using the form above');
      });
    });

    win.show();
  });

  function createTaskCard(task: Task) {
    // Use a Label as the draggable task (Label extends Widget)
    const taskLabel = a.label(`[${task.id}] ${task.title}`, undefined, 'leading');

    // Make the task draggable
    taskLabel.makeDraggable({
      dragData: task.id,
      onDragStart: () => {
        statusLabel.setText(`Dragging "${task.title}"...`);
      },
      onDragEnd: () => {
        statusLabel.setText(`Dropped "${task.title}"`);
      }
    });

    // Action buttons
    a.hbox(() => {
      if (task.column !== 'todo') {
        a.button('<').onClick(() => {
          const columns: Array<'todo' | 'inprogress' | 'done'> = ['todo', 'inprogress', 'done'];
          const currentIdx = columns.indexOf(task.column);
          if (currentIdx > 0) {
            moveTask(task.id, columns[currentIdx - 1]);
          }
        });
      }
      if (task.column !== 'done') {
        a.button('>').onClick(() => {
          const columns: Array<'todo' | 'inprogress' | 'done'> = ['todo', 'inprogress', 'done'];
          const currentIdx = columns.indexOf(task.column);
          if (currentIdx < columns.length - 1) {
            moveTask(task.id, columns[currentIdx + 1]);
          }
        });
      }
      a.button('X').onClick(() => {
        const idx = tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) {
          tasks.splice(idx, 1);
          statusLabel.setText(`Deleted "${task.title}"`);
        }
      });
    });

    return taskLabel;
  }
});
