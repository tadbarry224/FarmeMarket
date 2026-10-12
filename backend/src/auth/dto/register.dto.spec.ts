import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

// Reproduit ce que fait le ValidationPipe global : transformation puis validation
async function validateRegister(body: Record<string, unknown>) {
  const dto = plainToInstance(RegisterDto, body);
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
  fullName: '  Mamadou Diallo  ',
  phone: '622 12 34 56',
  email: '  Mamadou@Exemple.COM ',
  password: 'motdepasse123',
  roles: ['PRODUCER', 'BUYER'],
};

describe('RegisterDto', () => {
  it('accepte une inscription valide et normalise les champs', async () => {
    const { dto, messages } = await validateRegister(validBody);

    expect(messages).toEqual({});
    expect(dto.fullName).toBe('Mamadou Diallo');
    expect(dto.phone).toBe('+224622123456');
    expect(dto.email).toBe('mamadou@exemple.com');
  });

  it("accepte l'absence d'e-mail, y compris un champ laissé vide", async () => {
    const { dto, messages } = await validateRegister({
      ...validBody,
      email: '',
    });

    expect(messages).toEqual({});
    expect(dto.email).toBeUndefined();
  });

  it('rejette un numéro de téléphone invalide', async () => {
    const { messages } = await validateRegister({
      ...validBody,
      phone: '12345',
    });

    expect(messages.phone).toBe(
      'Numéro de téléphone guinéen invalide (ex. 622 12 34 56).',
    );
  });

  it('rejette une adresse e-mail invalide', async () => {
    const { messages } = await validateRegister({
      ...validBody,
      email: 'pas-un-email',
    });

    expect(messages.email).toBe('Adresse e-mail invalide.');
  });

  it('rejette un mot de passe trop court', async () => {
    const { messages } = await validateRegister({
      ...validBody,
      password: 'court',
    });

    expect(messages.password).toBe(
      'Le mot de passe doit contenir au moins 8 caractères.',
    );
  });

  it('rejette une inscription sans rôle', async () => {
    const { messages } = await validateRegister({ ...validBody, roles: [] });

    expect(messages.roles).toBe(
      'Choisissez au moins un rôle : producteur ou acheteur.',
    );
  });

  it('rejette le rôle ADMIN', async () => {
    const { messages } = await validateRegister({
      ...validBody,
      roles: ['BUYER', 'ADMIN'],
    });

    expect(messages.roles).toBe(
      'Rôle invalide : seuls « producteur » et « acheteur » sont possibles.',
    );
  });

  it('signale chaque champ obligatoire manquant', async () => {
    const { messages } = await validateRegister({});

    expect(messages).toEqual({
      fullName: 'Le nom complet est obligatoire.',
      phone: 'Le numéro de téléphone est obligatoire.',
      password: 'Le mot de passe est obligatoire.',
      roles: 'Choisissez au moins un rôle : producteur ou acheteur.',
    });
  });
});
