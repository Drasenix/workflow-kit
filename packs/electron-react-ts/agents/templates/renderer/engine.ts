// Statut : DÉFAUT PACK (non contractuel) — squelette d'engine singleton.

export default class <Nom>Engine {
  // eslint-disable-next-line no-use-before-define
  static #instance: <Nom>Engine;

  private items: <Nom>[] = [];

  public static getInstance(): <Nom>Engine {
    if (!<Nom>Engine.#instance) {
      <Nom>Engine.#instance = new <Nom>Engine();
    }
    return <Nom>Engine.#instance;
  }

  public load<Noms>(<noms>: <Nom>[]): void {
    this.items = <noms>;
  }
}
