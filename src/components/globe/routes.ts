export type City = {
  id: string;
  /** [долгота, широта] */
  coords: [number, number];
};

export const HOME: City = { id: "almaty", coords: [76.95, 43.24] };

// Порядок показа маршрутов на экране входа. Подписи — в messages (auth.routes.<id>).
export const DESTINATIONS: City[] = [
  { id: "galveston", coords: [-94.8, 29.3] },
  { id: "munich", coords: [11.58, 48.14] },
  { id: "newyork", coords: [-74.0, 40.71] },
  { id: "london", coords: [-0.13, 51.51] },
  { id: "dubai", coords: [55.27, 25.2] },
  { id: "maine", coords: [-69.4, 45.25] },
  { id: "seoul", coords: [126.98, 37.57] },
];
