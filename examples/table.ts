/**
 * Table Widget Example
 *
 * Demonstrates creating and updating tables with
 * headers and data rows.
 */

import { app, window, vbox, hbox, label, button, table } from '../core/src';

let employeeTable: any;
let statusLabel: any;

// Initial employee data
let employees = [
  ['1', 'John Doe', 'Engineering', '$75,000'],
  ['2', 'Jane Smith', 'Marketing', '$65,000'],
  ['3', 'Bob Johnson', 'Sales', '$60,000'],
  ['4', 'Alice Williams', 'Engineering', '$80,000'],
  ['5', 'Charlie Brown', 'HR', '$55,000']
];

app({ title: 'Table Demo' }, () => {
  window({ title: 'Table Example', width: 700, height: 500 }, (win) => {
    win.setContent(() => {
      vbox(() => {
        label('Table Widget Example');
        label('');

        // Status label
        statusLabel = label('Employee Database - 5 records');
        label('');

        // Create table with headers and data
        employeeTable = table(
          ['ID', 'Name', 'Department', 'Salary'],
          employees
        );

        label('');

        // Control buttons
        hbox(() => {
          button('Add Employee').onClick(async () => {
            const newId = (employees.length + 1).toString();
            const newEmployee = [
              newId,
              'New Employee',
              'Department',
              '$50,000'
            ];
            employees.push(newEmployee);
            await employeeTable.updateData(employees);
            statusLabel.setText(`Employee Database - ${employees.length} records`);
          });

          button('Remove Last').onClick(async () => {
            if (employees.length > 0) {
              employees.pop();
              await employeeTable.updateData(employees);
              statusLabel.setText(`Employee Database - ${employees.length} records`);
            } else {
              statusLabel.setText('No employees to remove');
            }
          });
        });

        label('');

        hbox(() => {
          button('Sort by Name').onClick(async () => {
            employees.sort((a, b) => a[1].localeCompare(b[1]));
            await employeeTable.updateData(employees);
            statusLabel.setText('Sorted by Name');
          });

          button('Sort by Department').onClick(async () => {
            employees.sort((a, b) => a[2].localeCompare(b[2]));
            await employeeTable.updateData(employees);
            statusLabel.setText('Sorted by Department');
          });

          button('Sort by ID').onClick(async () => {
            employees.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            await employeeTable.updateData(employees);
            statusLabel.setText('Sorted by ID');
          });
        });

        label('');

        hbox(() => {
          button('Filter Engineering').onClick(async () => {
            const filtered = employees.filter(emp => emp[2] === 'Engineering');
            await employeeTable.updateData(filtered);
            statusLabel.setText(`Showing ${filtered.length} Engineering employees`);
          });

          button('Show All').onClick(async () => {
            await employeeTable.updateData(employees);
            statusLabel.setText(`Employee Database - ${employees.length} records`);
          });
        });

        label('');

        hbox(() => {
          button('Load Sample Data').onClick(async () => {
            employees = [
              ['1', 'John Doe', 'Engineering', '$75,000'],
              ['2', 'Jane Smith', 'Marketing', '$65,000'],
              ['3', 'Bob Johnson', 'Sales', '$60,000'],
              ['4', 'Alice Williams', 'Engineering', '$80,000'],
              ['5', 'Charlie Brown', 'HR', '$55,000'],
              ['6', 'David Lee', 'Engineering', '$85,000'],
              ['7', 'Emma Davis', 'Marketing', '$70,000'],
              ['8', 'Frank Miller', 'Sales', '$62,000'],
              ['9', 'Grace Wilson', 'HR', '$58,000'],
              ['10', 'Henry Moore', 'Engineering', '$90,000']
            ];
            await employeeTable.updateData(employees);
            statusLabel.setText(`Employee Database - ${employees.length} records`);
          });

          button('Clear All').onClick(async () => {
            employees = [];
            await employeeTable.updateData(employees);
            statusLabel.setText('Employee Database - 0 records');
          });
        });
      });
    });

    win.show();
    win.centerOnScreen();
  });
});
