#!/usr/bin/env tsyne

/**
 * Line Markers Demo
 *
 * @tsyne-app:name Markers Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args (a: any) => void
 */

import { app } from '../../core/src/index';
import { cosyne, refreshAllCosyneContexts } from '../../cosyne/src/index';
import { CUSTOM_MARKERS } from '../../cosyne/src/markers';

type DiagramType = 'flowchart' | 'graph' | 'state-machine' | 'network' | 'custom';

class MarkersDemoStore {
  private changeListeners: Array<() => void> = [];
  public selectedDiagram: DiagramType = 'flowchart';
  public showLabels: boolean = true;

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }

  selectDiagram(diagram: DiagramType) {
    this.selectedDiagram = diagram;
    this.notifyChange();
  }

  toggleLabels(show: boolean) {
    this.showLabels = show;
    this.notifyChange();
  }
}

export function buildMarkersDemoApp(a: any) {
  const store = new MarkersDemoStore();

  let diagramLabel: any;
  let labelsCheckbox: any;

  a.window({ title: 'Line Markers Demo', width: 1000, height: 800 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Title
        a.label('Line Markers: Directed Graphs & Diagrams', undefined, undefined, undefined, { bold: true });

        // Controls
        a.hbox(() => {
          a.label('Select Diagram:');
          (['flowchart', 'graph', 'state-machine', 'network', 'custom'] as DiagramType[]).forEach((diagram) => {
            a.button(
              diagram
                .split('-')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' '),
              async () => store.selectDiagram(diagram)
            )
              .withId(`diagram-${diagram}`)
              .when(() => store.selectedDiagram !== diagram);
          });

          diagramLabel = a.label(`(${store.selectedDiagram})`).withId('diagramLabel');
        });

        // Checkbox for labels
        a.hbox(() => {
          labelsCheckbox = a.checkbox('Show labels', async (checked) => {
            store.toggleLabels(checked);
            await refreshAllCosyneContexts();
          }).withId('cbx-labels');
          if (store.showLabels) labelsCheckbox.setChecked(true);
        });

        // Canvas
        a.canvasStack(() => {
          const ctx = cosyne(a, (c) => {
            const width = 900;
            const height = 550;

            // Background
            c.rect(0, 0, width, height)
              .fill('#f8f8f8')
              .withId('background');

            switch (store.selectedDiagram) {
              case 'flowchart':
                renderFlowchart(c, store.showLabels);
                break;
              case 'graph':
                renderDirectedGraph(c, store.showLabels);
                break;
              case 'state-machine':
                renderStateMachine(c, store.showLabels);
                break;
              case 'network':
                renderNetworkTopology(c, store.showLabels);
                break;
              case 'custom':
                renderCustomMarkers(c, store.showLabels);
                break;
            }
          });
        });

        // Legend
        a.hbox(() => {
          a.label('Marker Types:');
          a.label('→ arrow')
            .withId('legend-arrow');
          a.label('⚬ circle')
            .withId('legend-circle');
          a.label('◼ square')
            .withId('legend-square');
          a.label('⬥ diamond')
            .withId('legend-diamond');
        });
      });
    });
    win.show();
  });

  // Subscribe to store changes
  store.subscribe(async () => {
    diagramLabel?.setText?.(`(${store.selectedDiagram})`);
    await refreshAllCosyneContexts();
  });
}

// Diagram renderers

function renderFlowchart(c: any, showLabels: boolean) {
  // Flowchart: Start → Process → Decision → Result

  // Start (rounded rectangle simulation)
  c.circle(50, 80, 20)
    .fill('#4ECDC4')
    .stroke('#333333', 2)
    .withId('start');

  if (showLabels) {
    c.text(50, 85, 'Start')
      .fill('#FFFFFF')
      .withId('label-start');
  }

  // Arrow: Start → Process
  c.line(50, 100, 50, 150)
    .stroke('#333333', 2)
    .endMarker('arrow', 10, '#333333')
    .withId('arrow-1');

  // Process box
  c.rect(20, 150, 60, 40)
    .fill('#FF6B6B')
    .stroke('#333333', 2)
    .withId('process');

  if (showLabels) {
    c.text(50, 175, 'Process')
      .fill('#FFFFFF')
      .withId('label-process');
  }

  // Arrow: Process → Decision
  c.line(50, 190, 50, 240)
    .stroke('#333333', 2)
    .endMarker('arrow', 10, '#333333')
    .withId('arrow-2');

  // Decision (diamond simulation using polygon)
  c.polygon(50, 280, [
    { x: 50, y: 240 },
    { x: 80, y: 280 },
    { x: 50, y: 320 },
    { x: 20, y: 280 },
  ])
    .fill('#FFD93D')
    .stroke('#333333', 2)
    .withId('decision');

  if (showLabels) {
    c.text(50, 285, 'OK?')
      .fill('#333333')
      .withId('label-decision');
  }

  // Arrow: Decision → Yes (right)
  c.line(80, 280, 150, 280)
    .stroke('#4ECDC4', 2)
    .endMarker('arrow', 10, '#4ECDC4')
    .withId('arrow-yes');

  if (showLabels) {
    c.text(115, 270, 'Yes')
      .fill('#4ECDC4')
      .withId('label-yes');
  }

  // Arrow: Decision → No (down)
  c.line(50, 320, 50, 380)
    .stroke('#FF6B6B', 2)
    .endMarker('arrow', 10, '#FF6B6B')
    .withId('arrow-no');

  if (showLabels) {
    c.text(65, 350, 'No')
      .fill('#FF6B6B')
      .withId('label-no');
  }

  // Result boxes
  c.rect(120, 260, 70, 40)
    .fill('#6BCB77')
    .stroke('#333333', 2)
    .withId('success');

  if (showLabels) {
    c.text(155, 285, 'Success')
      .fill('#FFFFFF')
      .withId('label-success');
  }

  c.rect(20, 380, 60, 40)
    .fill('#FF6B6B')
    .stroke('#333333', 2)
    .withId('retry');

  if (showLabels) {
    c.text(50, 405, 'Retry')
      .fill('#FFFFFF')
      .withId('label-retry');
  }

  // Arrow: Retry → Process (feedback loop)
  c.line(20, 400, 10, 400)
    .stroke('#FF6B6B', 2)
    .endMarker('arrow', 10, '#FF6B6B')
    .withId('arrow-feedback');

  c.line(10, 400, 10, 170)
    .stroke('#FF6B6B', 2)
    .withId('feedback-line');

  c.line(10, 170, 20, 170)
    .stroke('#FF6B6B', 2)
    .endMarker('arrow', 10, '#FF6B6B')
    .withId('arrow-back');
}

function renderDirectedGraph(c: any, showLabels: boolean) {
  // Nodes
  const nodes = [
    { x: 100, y: 80, id: 'A', color: '#FF6B6B' },
    { x: 300, y: 80, id: 'B', color: '#4ECDC4' },
    { x: 500, y: 80, id: 'C', color: '#45B7D1' },
    { x: 200, y: 250, id: 'D', color: '#95E1D3' },
    { x: 400, y: 250, id: 'E', color: '#FFD93D' },
  ];

  // Edges with arrows
  const edges = [
    { from: 0, to: 1 },
    { from: 0, to: 3 },
    { from: 1, to: 2 },
    { from: 1, to: 4 },
    { from: 3, to: 4 },
    { from: 4, to: 2 },
  ];

  // Draw edges first (so they're behind nodes)
  edges.forEach(({ from, to }, idx) => {
    const n1 = nodes[from];
    const n2 = nodes[to];
    c.line(n1.x, n1.y, n2.x, n2.y)
      .stroke('#999999', 1)
      .endMarker('arrow', 8, '#666666')
      .withId(`edge-${idx}`);
  });

  // Draw nodes
  nodes.forEach((node) => {
    c.circle(node.x, node.y, 25)
      .fill(node.color)
      .stroke('#333333', 2)
      .withId(`node-${node.id}`);

    if (showLabels) {
      c.text(node.x, node.y, node.id)
        .fill('#FFFFFF')
        .withId(`label-${node.id}`);
    }
  });
}

function renderStateMachine(c: any, showLabels: boolean) {
  // States: Idle → Running → Paused → Done

  // State circles
  const states = [
    { x: 80, y: 150, id: 'Idle', color: '#95E1D3' },
    { x: 280, y: 100, id: 'Running', color: '#FF6B6B' },
    { x: 280, y: 200, id: 'Paused', color: '#FFD93D' },
    { x: 450, y: 150, id: 'Done', color: '#6BCB77' },
  ];

  // Self-loop: Idle → Idle
  c.line(80, 120, 80, 100)
    .stroke('#999999', 1.5)
    .endMarker('arrow', 8, '#666666')
    .withId('self-loop');

  // Idle → Running
  c.line(110, 130, 250, 115)
    .stroke('#FF6B6B', 2)
    .endMarker('arrow', 8, '#FF6B6B')
    .withId('idle-running');

  if (showLabels) {
    c.text(170, 105, 'start')
      .fill('#FF6B6B')
      .withId('label-start-running');
  }

  // Running → Paused
  c.line(280, 130, 280, 170)
    .stroke('#FFD93D', 2)
    .endMarker('arrow', 8, '#FFD93D')
    .withId('running-paused');

  if (showLabels) {
    c.text(305, 150, 'pause')
      .fill('#FFD93D')
      .withId('label-pause');
  }

  // Paused → Running
  c.line(280, 170, 280, 140)
    .stroke('#FF6B6B', 2)
    .startMarker('arrow', 8, '#FF6B6B')
    .withId('paused-running');

  if (showLabels) {
    c.text(255, 150, 'resume')
      .fill('#FF6B6B')
      .withId('label-resume');
  }

  // Running → Done
  c.line(310, 100, 420, 130)
    .stroke('#6BCB77', 2)
    .endMarker('arrow', 8, '#6BCB77')
    .withId('running-done');

  if (showLabels) {
    c.text(360, 105, 'finish')
      .fill('#6BCB77')
      .withId('label-finish');
  }

  // Done → Idle (restart)
  c.line(420, 170, 110, 170)
    .stroke('#95E1D3', 2)
    .endMarker('arrow', 8, '#95E1D3')
    .withId('done-idle');

  if (showLabels) {
    c.text(260, 185, 'reset')
      .fill('#95E1D3')
      .withId('label-reset');
  }

  // Draw state circles
  states.forEach((state) => {
    c.circle(state.x, state.y, 30)
      .fill(state.color)
      .stroke('#333333', 2)
      .withId(`state-${state.id}`);

    if (showLabels) {
      c.text(state.x, state.y, state.id)
        .fill('#333333')
        .fontSize(10)
        .withId(`label-${state.id}`);
    }
  });
}

function renderNetworkTopology(c: any, showLabels: boolean) {
  // Network: Central server with connected clients

  const servers = [
    { x: 250, y: 150, id: 'Server', radius: 35, color: '#FF6B6B' },
  ];

  const clients = [
    { x: 100, y: 80, id: 'Client A', color: '#4ECDC4' },
    { x: 100, y: 220, id: 'Client B', color: '#4ECDC4' },
    { x: 400, y: 80, id: 'Client C', color: '#4ECDC4' },
    { x: 400, y: 220, id: 'Client D', color: '#4ECDC4' },
  ];

  // Draw connections (bidirectional with double arrows)
  clients.forEach((client, idx) => {
    const server = servers[0];

    // Client → Server
    c.line(client.x + 25, client.y, server.x - 35, server.y)
      .stroke('#999999', 1.5)
      .endMarker('arrow', 7, '#666666')
      .withId(`to-server-${idx}`);

    // Server → Client (offset)
    c.line(server.x - 35, server.y + 5, client.x + 25, client.y + 5)
      .stroke('#999999', 1.5)
      .endMarker('arrow', 7, '#666666')
      .withId(`from-server-${idx}`);
  });

  // Draw server
  const server = servers[0];
  c.circle(server.x, server.y, server.radius)
    .fill(server.color)
    .stroke('#333333', 2)
    .withId('server-node');

  if (showLabels) {
    c.text(server.x, server.y, server.id)
      .fill('#FFFFFF')
      .withId('label-server');
  }

  // Draw clients
  clients.forEach((client) => {
    c.rect(client.x - 20, client.y - 15, 40, 30)
      .fill(client.color)
      .stroke('#333333', 2)
      .withId(`client-${client.id}`);

    if (showLabels) {
      c.text(client.x, client.y, client.id.split(' ')[1])
        .fill('#FFFFFF')
        .fontSize(8)
        .withId(`label-${client.id}`);
    }
  });
}

function renderCustomMarkers(c: any, showLabels: boolean) {
  // Showcase all custom markers

  const markers = [
    { name: 'doubleArrow', x: 50, y: 80 },
    { name: 'openArrow', x: 150, y: 80 },
    { name: 'curvedArrow', x: 250, y: 80 },
    { name: 'reverseArrow', x: 350, y: 80 },
    { name: 'cross', x: 450, y: 80 },
    { name: 'tee', x: 550, y: 80 },
  ];

  markers.forEach((marker) => {
    const customMarker = (CUSTOM_MARKERS as any)[marker.name];
    if (customMarker) {
      // Draw line with marker
      c.line(marker.x - 30, marker.y, marker.x + 30, marker.y)
        .stroke('#333333', 2)
        .endMarker(customMarker, 12, '#FF6B6B')
        .withId(`line-${marker.name}`);

      if (showLabels) {
        c.text(marker.x, marker.y + 30, marker.name)
          .fill('#333333')
          .fontSize(9)
          .withId(`label-${marker.name}`);
      }
    }
  });

  // Builtin markers
  const builtins = [
    { name: 'arrow', x: 50, y: 200 },
    { name: 'circle', x: 150, y: 200 },
    { name: 'square', x: 250, y: 200 },
    { name: 'triangle', x: 350, y: 200 },
    { name: 'diamond', x: 450, y: 200 },
    { name: 'bar', x: 550, y: 200 },
  ];

  builtins.forEach((marker) => {
    c.line(marker.x - 30, marker.y, marker.x + 30, marker.y)
      .stroke('#333333', 2)
      .endMarker(marker.name as any, 12, '#4ECDC4')
      .withId(`builtin-${marker.name}`);

    if (showLabels) {
      c.text(marker.x, marker.y + 30, marker.name)
        .fill('#333333')
        .fontSize(9)
        .withId(`label-builtin-${marker.name}`);
    }
  });
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Markers Demo' }, buildMarkersDemoApp);
}
