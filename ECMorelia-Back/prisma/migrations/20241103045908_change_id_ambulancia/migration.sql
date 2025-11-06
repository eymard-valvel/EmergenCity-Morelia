/*
  Warnings:

  - The primary key for the `ambulancias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ambulancias_doctor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ambulancias_hospitales` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "ambulancias_doctor" DROP CONSTRAINT "ambulancias_doctor_numero_placa_sm_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_hospitales" DROP CONSTRAINT "ambulancias_hospitales_numero_placa_sm_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_paramedicos" DROP CONSTRAINT "ambulancias_paramedicos_numero_placa_sm_fkey";

-- AlterTable
ALTER TABLE "ambulancias" DROP CONSTRAINT "ambulancias_pkey",
ALTER COLUMN "numero_placa_sm" SET DATA TYPE TEXT,
ADD CONSTRAINT "ambulancias_pkey" PRIMARY KEY ("numero_placa_sm");

-- AlterTable
ALTER TABLE "ambulancias_doctor" DROP CONSTRAINT "ambulancias_doctor_pkey",
ALTER COLUMN "numero_placa_sm" SET DATA TYPE TEXT,
ADD CONSTRAINT "ambulancias_doctor_pkey" PRIMARY KEY ("id_doctor", "numero_placa_sm");

-- AlterTable
ALTER TABLE "ambulancias_hospitales" DROP CONSTRAINT "ambulancias_hospitales_pkey",
ALTER COLUMN "numero_placa_sm" SET DATA TYPE TEXT,
ADD CONSTRAINT "ambulancias_hospitales_pkey" PRIMARY KEY ("id_hospitales", "numero_placa_sm");

-- AlterTable
ALTER TABLE "ambulancias_paramedicos" ALTER COLUMN "numero_placa_sm" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "ambulancias_doctor" ADD CONSTRAINT "ambulancias_doctor_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_hospitales" ADD CONSTRAINT "ambulancias_hospitales_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_paramedicos" ADD CONSTRAINT "ambulancias_paramedicos_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;
