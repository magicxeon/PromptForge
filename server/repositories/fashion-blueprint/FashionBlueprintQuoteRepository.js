import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const FALLBACK = { schemaVersion: 1, quotes: [] };

export class FashionBlueprintQuoteRepository {
  constructor({ filePath = resolveDataFile('fashionBlueprintQuotes') } = {}) {
    this.filePath = filePath;
  }

  async save(quote) {
    return mutateJsonFile(this.filePath, FALLBACK, data => {
      data.schemaVersion = 1;
      data.quotes = Array.isArray(data.quotes) ? data.quotes : [];
      const index = data.quotes.findIndex(item => item.id === quote.id);
      if (index >= 0) data.quotes[index] = structuredClone(quote);
      else data.quotes.push(structuredClone(quote));
      return structuredClone(quote);
    });
  }

  async findById(id) {
    const data = await readJsonFile(this.filePath, FALLBACK);
    const quote = (data.quotes || []).find(item => item.id === id);
    return quote ? structuredClone(quote) : null;
  }
}

export const fashionBlueprintQuoteRepository = new FashionBlueprintQuoteRepository();
