-- CreateEnum
CREATE TYPE "Disposition" AS ENUM ('si', 'no');

-- CreateEnum
CREATE TYPE "Shifts" AS ENUM ('diurno', 'nocturno');

-- AlterTable
ALTER TABLE "ambulancias" ADD COLUMN     "disponible" "Disposition" NOT NULL DEFAULT 'si',
ADD COLUMN     "modelo" VARCHAR(255),
ALTER COLUMN "numero_placa_sm" DROP DEFAULT;
DROP SEQUENCE "ambulancias_numero_placa_sm_seq";

-- AlterTable
ALTER TABLE "doctor" ADD COLUMN     "especialidad" VARCHAR(255);

-- AlterTable
ALTER TABLE "operador" ADD COLUMN     "turno" "Shifts";
