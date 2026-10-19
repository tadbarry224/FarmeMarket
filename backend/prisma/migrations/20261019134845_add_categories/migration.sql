-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- Catégories initiales (données de référence nécessaires dans toutes les bases)
INSERT INTO "Category" ("id", "name", "description") VALUES
  (gen_random_uuid()::text, 'Céréales', 'Riz, maïs, fonio, mil, sorgho'),
  (gen_random_uuid()::text, 'Tubercules', 'Manioc, igname, patate douce, pomme de terre, taro'),
  (gen_random_uuid()::text, 'Légumes', 'Tomate, oignon, aubergine, piment, gombo, chou'),
  (gen_random_uuid()::text, 'Fruits', 'Mangue, ananas, banane, orange, avocat'),
  (gen_random_uuid()::text, 'Légumineuses et oléagineux', 'Arachide, niébé, haricot, sésame'),
  (gen_random_uuid()::text, 'Cultures de rente', 'Café, cacao, anacarde, coton'),
  (gen_random_uuid()::text, 'Élevage', 'Bovins, ovins, caprins, volaille, œufs, lait'),
  (gen_random_uuid()::text, 'Produits transformés', 'Huile de palme, farine, beurre de karité, miel');
