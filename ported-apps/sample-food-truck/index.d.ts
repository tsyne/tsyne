/**
 * Food Truck Sample App - Tsyne Port
 *
 * @tsyne-app:name Food Truck
 * @tsyne-app:icon confirm
 * @tsyne-app:category Utilities
 * @tsyne-app:args (a: App) => void
 *
 * A food truck order management system showcasing:
 * - Order tracking and status management
 * - Sales analytics with popular menu items
 * - Weather information
 * - Responsive sidebar layout
 *
 * Portions copyright Apple Inc and portions copyright Paul Hammant 2025
 */
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
type ChangeListener = () => void;
export declare class FoodTruckStore {
    private menuItems;
    private orders;
    private nextOrderId;
    private weather;
    private changeListeners;
    subscribe(listener: ChangeListener): () => void;
    private notifyChange;
    getOrders(): Order[];
    getPendingOrders(): Order[];
    getReadyOrders(): Order[];
    getCompletedOrders(): Order[];
    addOrder(items: MenuItem[]): Order;
    markOrderReady(orderId: string): void;
    markOrderCompleted(orderId: string): void;
    getMenuItems(): MenuItem[];
    getTopSalesItems(limit?: number): MenuItem[];
    getWeather(): WeatherData;
    updateWeather(weather: Partial<WeatherData>): void;
    getTotalSales(): number;
    getPendingCount(): number;
    getReadyCount(): number;
}
export declare function buildFoodTruckApp(a: any): void;
export default buildFoodTruckApp;
