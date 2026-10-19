import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertProducerProfileDto } from './upsert-producer-profile.dto';

// Reproduit ce que fait le ValidationPipe global : transformation puis validation
async function validateProfile(body: Record<string, unknown>) {
  const dto = plainToInstance(UpsertProducerProfileDto, body);
  const errors = await validate(dto, { stopAtFirstError: true });
  const messages = Object.fromEntries(
    errors.map((error) => [
      error.property,
      Object.values(error.constraints ?? {})[0],
    ]),
  );
  return { dto, messages };
}

const validBody = {
  farmType: 'CROPS',
  region: ' Kindia ',
  prefecture: 'Forécariah',
  commune: '  Maférinyah ',
  address: '',
  description: 'Riziculture familiale depuis 1998.',
};

describe('UpsertProducerProfileDto', () => {
  it('accepte un profil valide et normalise les champs', async () => {
    const { dto, messages } = await validateProfile(validBody);

    expect(messages).toEqual({});
    expect(dto.region).toBe('Kindia');
    expect(dto.commune).toBe('Maférinyah');
    // Champ laissé vide dans le formulaire
    expect(dto.address).toBeUndefined();
  });

  it('rejette une région inconnue', async () => {
    const { messages } = await validateProfile({
      ...validBody,
      region: 'Paris',
    });

    expect(messages.region).toBe('Région inconnue.');
  });

  it("rejette une préfecture qui n'appartient pas à la région", async () => {
    const { messages } = await validateProfile({
      ...validBody,
      region: 'Labé',
      prefecture: 'Forécariah',
    });

    expect(messages.prefecture).toBe(
      'Cette préfecture ne fait pas partie de la région choisie.',
    );
  });

  it("rejette un type d'exploitation invalide", async () => {
    const { messages } = await validateProfile({
      ...validBody,
      farmType: 'FACTORY',
    });

    expect(messages.farmType).toBe(
      "Type d'exploitation invalide : cultures, élevage, mixte ou autre.",
    );
  });

  it('signale chaque champ obligatoire manquant', async () => {
    const { messages } = await validateProfile({});

    expect(messages).toEqual({
      farmType: "Le type d'exploitation est obligatoire.",
      region: 'La région est obligatoire.',
      prefecture: 'La préfecture est obligatoire.',
    });
  });
});
