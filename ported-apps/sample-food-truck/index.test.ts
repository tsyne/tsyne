/**
 * Jest Tests for Food Truck Store
 *
 * Tests for the FoodTruckStore model, including order management,
 * menu items, weather, and analytics functionality.
 */

import { FoodTruckStore, MenuItem, Order } from './index';

describe('FoodTruckStore', () => {
  let store: FoodTruckStore;

  beforeEach(() => {
    store = new FoodTruckStore();
  });

  describe('Menu Items', () => {
    it('should return all menu items', () => {
      const items = store.getMenuItems();
      expect(items).toHaveLength(5);
      expect(items[0].name).toBe('Burger');
    });

    it('should return top sales items sorted correctly', () => {
      const topItems = store.getTopSalesItems(3);
      expect(topItems).toHaveLength(3);
      // Pizza (71) should be first, then Tacos (62), then Burger (45)
      expect(topItems[0].name).toBe('Pizza Slice');
      expect(topItems[1].name).toBe('Tacos (3)');
      expect(topItems[2].name).toBe('Burger');
    });

    it('should limit top sales items', () => {
      const topItems = store.getTopSalesItems(2);
      expect(topItems).toHaveLength(2);
    });
  });

  describe('Order Management', () => {
    it('should return initial orders', () => {
      const orders = store.getOrders();
      expect(orders.length).toBeGreaterThan(0);
    });

    it('should add a new order', () => {
      const burger = store.getMenuItems()[0];
      const initialCount = store.getOrders().length;

      store.addOrder([burger]);

      expect(store.getOrders()).toHaveLength(initialCount + 1);
    });

    it('should calculate order total correctly', () => {
      const items = [store.getMenuItems()[0], store.getMenuItems()[1]];
      const order = store.addOrder(items);

      // Burger (12.99) + Tacos (9.99) = 22.98
      expect(order.total).toBe(22.98);
    });

    it('should set order status to pending when created', () => {
      const burger = store.getMenuItems()[0];
      const order = store.addOrder([burger]);

      expect(order.status).toBe('pending');
    });

    it('should mark order as ready', () => {
      const burger = store.getMenuItems()[0];
      const order = store.addOrder([burger]);
      const orderId = order.id;

      store.markOrderReady(orderId);

      const updatedOrder = store.getOrders().find((o: Order) => o.id === orderId);
      expect(updatedOrder?.status).toBe('ready');
    });

    it('should mark order as completed', () => {
      const burger = store.getMenuItems()[0];
      const order = store.addOrder([burger]);
      const orderId = order.id;

      store.markOrderCompleted(orderId);

      const updatedOrder = store.getOrders().find((o: Order) => o.id === orderId);
      expect(updatedOrder?.status).toBe('completed');
    });
  });

  describe('Order Filtering', () => {
    beforeEach(() => {
      // Add some test orders
      const burger = store.getMenuItems()[0];
      store.addOrder([burger]); // pending
      store.addOrder([burger]); // pending
    });

    it('should return only pending orders', () => {
      const pending = store.getPendingOrders();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending.every((o) => o.status === 'pending')).toBe(true);
    });

    it('should return only ready orders', () => {
      const orders = store.getOrders();
      const readyOrder = orders.find((o) => o.status === 'ready');

      if (readyOrder) {
        const ready = store.getReadyOrders();
        expect(ready.some((o) => o.id === readyOrder.id)).toBe(true);
        expect(ready.every((o) => o.status === 'ready')).toBe(true);
      }
    });

    it('should return only completed orders', () => {
      const completed = store.getCompletedOrders();
      if (completed.length > 0) {
        expect(completed.every((o) => o.status === 'completed')).toBe(true);
      }
    });
  });

  describe('Analytics', () => {
    it('should calculate pending count', () => {
      const initialPending = store.getPendingCount();
      expect(typeof initialPending).toBe('number');
      expect(initialPending).toBeGreaterThanOrEqual(0);
    });

    it('should calculate ready count', () => {
      const ready = store.getReadyCount();
      expect(typeof ready).toBe('number');
      expect(ready).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total sales (pending + ready only)', () => {
      const burger = store.getMenuItems()[0];
      store.addOrder([burger]); // adds $12.99

      const totalSales = store.getTotalSales();
      expect(totalSales).toBeGreaterThan(0);
    });
  });

  describe('Weather', () => {
    it('should return weather data', () => {
      const weather = store.getWeather();
      expect(weather).toHaveProperty('location');
      expect(weather).toHaveProperty('temperature');
      expect(weather).toHaveProperty('condition');
      expect(weather).toHaveProperty('icon');
    });

    it('should have temperature as number', () => {
      const weather = store.getWeather();
      expect(typeof weather.temperature).toBe('number');
    });

    it('should update weather', () => {
      store.updateWeather({
        temperature: 85,
        condition: 'Hot and Sunny',
      });

      const updated = store.getWeather();
      expect(updated.temperature).toBe(85);
      expect(updated.condition).toBe('Hot and Sunny');
    });

    it('should preserve location when updating partial weather', () => {
      const original = store.getWeather();
      store.updateWeather({
        temperature: 90,
      });

      const updated = store.getWeather();
      expect(updated.location).toBe(original.location);
    });
  });

  describe('Subscriptions', () => {
    it('should notify listeners on order added', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      const burger = store.getMenuItems()[0];
      store.addOrder([burger]);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on order status change', async () => {
      const listener = jest.fn();
      const burger = store.getMenuItems()[0];
      const order = store.addOrder([burger]);

      // Reset listener count
      listener.mockClear();
      store.subscribe(listener);

      store.markOrderReady(order.id);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on weather update', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.updateWeather({ temperature: 100 });

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      const burger = store.getMenuItems()[0];
      store.addOrder([burger]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Order Data Integrity', () => {
    it('should not mutate returned orders array', () => {
      const orders1 = store.getOrders();
      const orders2 = store.getOrders();

      expect(orders1).not.toBe(orders2);
    });

    it('should generate unique order IDs', () => {
      const burger = store.getMenuItems()[0];
      const order1 = store.addOrder([burger]);
      const order2 = store.addOrder([burger]);

      expect(order1.id).not.toBe(order2.id);
    });

    it('should properly copy items in order', () => {
      const items = [store.getMenuItems()[0], store.getMenuItems()[1]];
      const order = store.addOrder(items);

      expect(order.items).toEqual(items);
      expect(order.items).not.toBe(items);
    });
  });
});
