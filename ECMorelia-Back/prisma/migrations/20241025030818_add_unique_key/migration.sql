/*
  Warnings:

  - A unique constraint covering the columns `[licencia_medica]` on the table `doctor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[licencia_medica]` on the table `operador` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[licencia_medica]` on the table `paramedicos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "doctor_licencia_medica_key" ON "doctor"("licencia_medica");

-- CreateIndex
CREATE UNIQUE INDEX "operador_licencia_medica_key" ON "operador"("licencia_medica");

-- CreateIndex
CREATE UNIQUE INDEX "paramedicos_licencia_medica_key" ON "paramedicos"("licencia_medica");
