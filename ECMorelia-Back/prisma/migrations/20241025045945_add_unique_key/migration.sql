/*
  Warnings:

  - A unique constraint covering the columns `[nombre]` on the table `hospitales` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "hospitales_nombre_key" ON "hospitales"("nombre");
