/**
 * Food Truck Sample App - Tsyne Port
 *
 * @tsyne-app:name Food Truck
 * @tsyne-app:icon confirm
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildFoodTruckApp
 * @tsyne-app:args app,windowWidth,windowHeight
 *
 * A food truck order management system showcasing:
 * - Order tracking and status management
 * - Sales analytics with popular menu items
 * - Weather information
 * - Responsive sidebar layout
 *
 * Portions copyright Apple Inc and portions copyright Paul Hammant 2025
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  salesCount: number;
}

export interface Order {
  id: string;
  items: MenuItem[];
  status: 'pending' | 'ready' | 'completed';
  total: number;
  timestamp: Date;
}

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
}

// ============================================================================
// STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class FoodTruckStore {
  private menuItems: MenuItem[] = [
    { id: 'burger', name: 'Burger', price: 12.99, salesCount: 45 },
    { id: 'tacos', name: 'Tacos (3)', price: 9.99, salesCount: 62 },
    { id: 'hotdog', name: 'Hot Dog', price: 7.99, salesCount: 38 },
    { id: 'pizza', name: 'Pizza Slice', price: 5.99, salesCount: 71 },
    { id: 'salad', name: 'Garden Salad', price: 8.99, salesCount: 22 },
  ];

  private orders: Order[] = [
    {
      id: 'order-001',
      items: [this.menuItems[0], this.menuItems[1]],
      status: 'pending',
      total: 22.98,
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: 'order-002',
      items: [this.menuItems[3], this.menuItems[3]],
      status: 'ready',
      total: 11.98,
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: 'order-003',
      items: [this.menuItems[2]],
      status: 'completed',
      total: 7.99,
      timestamp: new Date(Date.now() - 600000),
    },
  ];

  private nextOrderId = 4;
  private weather: WeatherData = {
    location: 'Downtown Park',
    temperature: 72,
    condition: 'Sunny',
    icon: '☀️',
  };

  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========== Orders ==========
  getOrders(): Order[] {
    return [...this.orders];
  }

  getPendingOrders(): Order[] {
    return this.orders.filter((o) => o.status === 'pending');
  }

  getReadyOrders(): Order[] {
    return this.orders.filter((o) => o.status === 'ready');
  }

  getCompletedOrders(): Order[] {
    return this.orders.filter((o) => o.status === 'completed');
  }

  addOrder(items: MenuItem[]): Order {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const order: Order = {
      id: `order-${String(this.nextOrderId++).padStart(3, '0')}`,
      items: [...items], // Defensive copy
      status: 'pending',
      total: Math.round(total * 100) / 100,
      timestamp: new Date(),
    };
    this.orders.unshift(order);
    this.notifyChange();
    return order;
  }

  markOrderReady(orderId: string) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'ready';
      this.notifyChange();
    }
  }

  markOrderCompleted(orderId: string) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'completed';
      this.notifyChange();
    }
  }

  // ========== Menu Items ==========
  getMenuItems(): MenuItem[] {
    return [...this.menuItems];
  }

  getTopSalesItems(limit: number = 5): MenuItem[] {
    return [...this.menuItems]
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, limit);
  }

  // ========== Weather ==========
  getWeather(): WeatherData {
    return { ...this.weather };
  }

  updateWeather(weather: Partial<WeatherData>) {
    this.weather = { ...this.weather, ...weather };
    this.notifyChange();
  }

  // ========== Analytics ==========
  getTotalSales(): number {
    return this.orders
      .filter((o) => o.status !== 'completed')
      .reduce((sum, o) => sum + o.total, 0);
  }

  getPendingCount(): number {
    return this.getPendingOrders().length;
  }

  getReadyCount(): number {
    return this.getReadyOrders().length;
  }
}

// ============================================================================
// VIEW BUILDER
// ============================================================================

export function buildFoodTruckApp(a: any, windowWidth?: number, windowHeight?: number): void {
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  const store = new FoodTruckStore();
  let selectedView: 'orders' | 'sales' | 'weather' = 'orders';

  // Widget references for dynamic updates
  let statusSummary: any;
  let ordersContainer: any;
  let salesContainer: any;
  let weatherContainer: any;
  let viewStack: any;

  async function updateStatusSummary() {
    if (statusSummary) {
      await statusSummary.setText(
        `Pending: ${store.getPendingCount()} | Ready: ${store.getReadyCount()}`
      );
    }
  }

  async function rebuildOrdersView() {
    if (!ordersContainer) return;

    // Clear and rebuild
    const pendingOrders = store.getPendingOrders();
    const readyOrders = store.getReadyOrders();

    // Rebuild using bindTo for smart diffing
    if (ordersContainer.boundList) {
      ordersContainer.boundList.update();
    }
  }

  const buildContent = () => {
    a.hbox(() => {
        // ===== SIDEBAR =====
        a.vbox(
          () => {
            a.label('🚚 Food Truck').withId('app-title');
            a.separator();

            a.button('Orders')
              .withId('btn-orders')
              .onClick(async () => {
                selectedView = 'orders';
                await showView('orders');
              });

            a.button('Sales')
              .withId('btn-sales')
              .onClick(async () => {
                selectedView = 'sales';
                await showView('sales');
              });

            a.button('Weather')
              .withId('btn-weather')
              .onClick(async () => {
                selectedView = 'weather';
                await showView('weather');
              });

            a.spacer();
            a.label('Status', 'sidebar-label');
            statusSummary = a.label('Pending: 0 | Ready: 0').withId('status-summary');
          },
          220,
          true
        );

        // ===== MAIN CONTENT AREA =====
        viewStack = a.vbox(() => {
          // Orders View
          ordersContainer = a.vbox(() => {
            a.label('📋 Order Management').withId('orders-title');
            a.separator();

            a.hbox(() => {
              a.label('Quick Add:', 'quick-add-label');
              a.button('Burger')
                .withId('add-burger')
                .onClick(() => store.addOrder([store.getMenuItems()[0]]));
              a.button('Tacos')
                .withId('add-tacos')
                .onClick(() => store.addOrder([store.getMenuItems()[1]]));
              a.button('Pizza')
                .withId('add-pizza')
                .onClick(() => store.addOrder([store.getMenuItems()[3]]));
              a.button('Random')
                .withId('add-random')
                .onClick(() => {
                  const items = store.getMenuItems();
                  const randomItem = items[Math.floor(Math.random() * items.length)];
                  store.addOrder([randomItem]);
                });
            });

            a.separator();

            // Pending orders list
            a.vbox(() => {
              a.label('🔴 Pending Orders').withId('pending-section-title');
            })
              .bindTo({
                items: () => store.getPendingOrders(),
                empty: () => {
                  a.label('No pending orders');
                },
                render: (order: Order) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(order.id).withId(`order-id-${order.id}`);
                      a.label(`${order.items.map((i) => i.name).join(', ')}`).withId(
                        `order-items-${order.id}`
                      );
                      a.label(`$${order.total.toFixed(2)}`).withId(
                        `order-total-${order.id}`
                      );
                    });
                    a.spacer();
                    a.button('Mark Ready')
                      .withId(`btn-ready-${order.id}`)
                      .onClick(() => store.markOrderReady(order.id));
                  });
                },
                trackBy: (order: Order) => order.id,
              });

            a.spacer();

            // Ready orders list
            a.vbox(() => {
              a.label('🟢 Ready for Pickup').withId('ready-section-title');
            })
              .bindTo({
                items: () => store.getReadyOrders(),
                empty: () => {
                  a.label('No ready orders');
                },
                render: (order: Order) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(order.id).withId(`order-id-${order.id}`);
                      a.label(`${order.items.map((i) => i.name).join(', ')}`).withId(
                        `order-items-${order.id}`
                      );
                      a.label(`$${order.total.toFixed(2)}`).withId(
                        `order-total-${order.id}`
                      );
                    });
                    a.spacer();
                    a.button('Mark Complete')
                      .withId(`btn-complete-${order.id}`)
                      .onClick(() => store.markOrderCompleted(order.id));
                  });
                },
                trackBy: (order: Order) => order.id,
              });
          }).when(() => selectedView === 'orders');

          // Sales View
          salesContainer = a.vbox(() => {
            a.label('📊 Sales Analytics').withId('sales-title');
            a.separator();

            let totalSalesLabel: any;
            totalSalesLabel = a.label('').withId('total-sales');

            a.label('Top Menu Items:').withId('top-items-label');

            a.vbox(() => {
              // Empty state handled by bindTo
            })
              .bindTo({
                items: () => store.getTopSalesItems(5),
                empty: () => {
                  a.label('No sales data');
                },
                render: (item: MenuItem, index: number) => {
                  const barLength = Math.ceil(item.salesCount / 5);
                  const bar = '█'.repeat(barLength);
                  a.hbox(() => {
                    a.label(`${index + 1}. ${item.name.padEnd(18)}`, 'sales-name').withId(
                      `sales-item-${item.id}`
                    );
                    a.label(`${bar} ${item.salesCount}`, 'sales-bar').withId(
                      `sales-bar-${item.id}`
                    );
                  });
                },
                trackBy: (item: MenuItem) => item.id,
              });
          }).when(() => selectedView === 'sales');

          // Weather View
          weatherContainer = a.vbox(() => {
            a.label('🌤️ Location Weather').withId('weather-title');
            a.separator();

            let weatherLocation: any;
            let weatherTemp: any;
            let weatherCondition: any;

            const weather = store.getWeather();

            a.hbox(() => {
              a.label(weather.icon, 'weather-icon-label');
              a.vbox(() => {
                weatherLocation = a.label(`📍 ${weather.location}`).withId('weather-location');
                weatherTemp = a.label(`🌡️ ${weather.temperature}°F`).withId(
                  'weather-temperature'
                );
                weatherCondition = a.label(`☁️ ${weather.condition}`).withId(
                  'weather-condition'
                );
              });
            });

            a.separator();

            a.button('Update Weather')
              .withId('btn-update-weather')
              .onClick(() => {
                const conditions = [
                  { condition: 'Sunny', icon: '☀️', temp: 75 },
                  { condition: 'Cloudy', icon: '☁️', temp: 68 },
                  { condition: 'Rainy', icon: '🌧️', temp: 62 },
                  { condition: 'Windy', icon: '🌪️', temp: 65 },
                ];
                const newCond =
                  conditions[Math.floor(Math.random() * conditions.length)];
                store.updateWeather({
                  temperature: newCond.temp,
                  condition: newCond.condition,
                  icon: newCond.icon,
                });
              });
          }).when(() => selectedView === 'weather');
        });
      });
    });
  };

  async function showView(view: string) {
    await viewStack.refresh();
    if (view === 'sales') {
      await salesContainer.setText(
        `Total Sales: $${store.getTotalSales().toFixed(2)}`
      );
    }
  }

  // Subscribe to store changes
  store.subscribe(async () => {
    await updateStatusSummary();
    await viewStack.refresh();
  });

  if (isEmbedded) {
    buildContent();
    (async () => {
      await updateStatusSummary();
    })();
  } else {
    a.window({ title: 'Food Truck Manager', width: 1100, height: 700 }, (win: any) => {
      win.setContent(buildContent);

      // Initial setup
      (async () => {
        await updateStatusSummary();
      })();

      win.show();
    });
  }
}

export default buildFoodTruckApp;
