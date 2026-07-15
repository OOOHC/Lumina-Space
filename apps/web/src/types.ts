export interface Photo {
  id: string;
  title: string;
  caption: string;
  /** Attribution line shown with metadata; identifies placeholder assets honestly. */
  credit: string;
  /** Public URL under /photos/ — never imported through the JS bundle. */
  src: string;
  width: number;
  height: number;
  location?: string;
  year?: number;
}
