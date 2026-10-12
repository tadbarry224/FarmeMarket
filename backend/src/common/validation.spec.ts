import { BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { createValidationPipe } from './validation';

class SampleDto {
  @IsString({ message: 'Le nom est obligatoire.' })
  name: string;
}

async function getErrorBody(body: unknown) {
  const pipe = createValidationPipe();
  try {
    await pipe.transform(body, { type: 'body', metatype: SampleDto });
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse();
  }
  throw new Error('La validation aurait dû échouer');
}

describe('createValidationPipe', () => {
  it('renvoie un message par champ', async () => {
    expect(await getErrorBody({})).toEqual({
      statusCode: 400,
      message: 'Certains champs sont invalides.',
      errors: { name: 'Le nom est obligatoire.' },
    });
  });

  it('traduit le refus des champs non autorisés', async () => {
    const body = await getErrorBody({ name: 'Mamadou', isAdmin: true });

    expect(body).toMatchObject({
      errors: { isAdmin: 'Champ non autorisé.' },
    });
  });
});
