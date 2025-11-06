/*
  Warnings:

  - You are about to alter the column `password` on the `doctor` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `password` on the `hospitales` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `password` on the `operador` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `password` on the `paramedicos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE "ambulancias_paramedicos" ALTER COLUMN "id_ambulancias_paramedicos" DROP DEFAULT;
DROP SEQUENCE "ambulancias_paramedicos_id_ambulancias_paramedicos_seq";

-- AlterTable
ALTER TABLE "doctor" ALTER COLUMN "password" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "hospitales" ALTER COLUMN "password" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "operador" ALTER COLUMN "password" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "paramedicos" ALTER COLUMN "password" SET DATA TYPE VARCHAR(50);
