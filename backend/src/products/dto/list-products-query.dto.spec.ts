import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListProductsQueryDto } from './list-products-query.dto';

// Reproduit ce que fait le ValidationPipe global : transformation puis validation.
// Les paramètres d'URL arrivent toujours sous forme de chaînes.
async function validateQuery(query: Record<string, string>) {
  const dto = plainToInstance(ListProductsQueryDto, query);
  const errors = await validate(dto, { stopAtFirstError: true });
  const messages = Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.values(error.constraints ?? {})[0],
    ]),
  );
  return { dto, messages };
}

describe('ListProductsQueryDto', () => {
  it('accepte une requête sans aucun filtre', async () => {
    const { messages } = await validateQuery({});

    expect(messages).toEqual({});
  });

  it('convertit les nombres et ignore les champs laissés vides', async () => {
    const { dto, messages } = await validateQuery({
      q: '  riz ',
      region: 'Kindia',
      minPrice: '5000',
      maxPrice: ' ',
      page: '2',
      sort: 'price_asc',
    });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({
      q: 'riz',
      region: 'Kindia',
      minPrice: 5000,
      page: 2,
      sort: 'price_asc',
    });
    expect(dto.maxPrice).toBeUndefined();
  });

  it('rejette un nombre mal écrit ou négatif', async () => {
    const { messages } = await validateQuery({
      minPrice: '8 000 GNF',
      minQuantity: '-5',
      page: '0',
    });

    expect(messages).toEqual({
      minPrice: 'Le prix minimum doit être un nombre entier.',
      minQuantity: 'La quantité minimum ne peut pas être négative.',
      page: 'Le numéro de page doit être au moins 1.',
    });
  });

  it('limite le nombre de produits par page', async () => {
    const { messages } = await validateQuery({ pageSize: '500' });

    expect(messages.pageSize).toBe('Au plus 50 résultats par page.');
  });

  it('rejette une localisation, un tri ou une date inconnus', async () => {
    const { messages } = await validateQuery({
      region: 'Paris',
      prefecture: 'Lyon',
      sort: 'name',
      availableOn: '2026-13-01',
    });

    expect(messages).toEqual({
      region: 'Région inconnue.',
      prefecture: 'Préfecture inconnue.',
      sort: 'Tri invalide : recent, price_asc, price_desc ou quantity_desc.',
      availableOn: 'Date invalide.',
    });
  });
});
