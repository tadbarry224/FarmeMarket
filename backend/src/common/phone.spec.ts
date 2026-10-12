import { normalizeGuineaPhone } from './phone';

describe('normalizeGuineaPhone', () => {
  describe('numéros valides', () => {
    it.each([
      ['622123456', 'numéro local sans indicatif (+224 par défaut)'],
      ['622 12 34 56', 'numéro local avec espaces'],
      ['622.12.34.56', 'numéro local avec points'],
      ['622-12-34-56', 'numéro local avec tirets'],
      ['+224622123456', 'format international'],
      ['+224 622 12 34 56', 'format international avec espaces'],
      ['(+224) 622 12 34 56', 'indicatif entre parenthèses'],
      ['00224622123456', 'indicatif avec 00'],
      ['224622123456', 'indicatif sans + ni 00'],
      ['  622123456  ', 'espaces autour du numéro'],
    ])('normalise %p (%s)', (input) => {
      expect(normalizeGuineaPhone(input)).toBe('+224622123456');
    });

    it('accepte un numéro fixe (commençant par 3)', () => {
      expect(normalizeGuineaPhone('30 12 34 56 7')).toBe('+224301234567');
    });
  });

  describe('numéros invalides', () => {
    it.each([
      ['', 'chaîne vide'],
      ['12345', 'trop court'],
      ['6221234567', 'trop long (10 chiffres)'],
      ['522123456', 'ne commence ni par 6 ni par 3'],
      ['+221771234567', 'numéro sénégalais'],
      ['+33612345678', 'numéro français'],
      ['62212345a', 'contient une lettre'],
      ['+224 62212345', 'international mais trop court'],
      ['622+123456', 'signe + mal placé'],
    ])('rejette %p (%s)', (input) => {
      expect(normalizeGuineaPhone(input)).toBeNull();
    });
  });
});
