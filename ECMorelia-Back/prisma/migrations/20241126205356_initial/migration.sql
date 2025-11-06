/*
  Warnings:

  - A unique constraint covering the columns `[numero_placa_sm]` on the table `ambulancias` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_ambulancias_paramedicos]` on the table `ambulancias_paramedicos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ambulancias" DROP CONSTRAINT "ambulancias_id_hospitales_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias" DROP CONSTRAINT "ambulancias_id_paramedicos_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_doctor" DROP CONSTRAINT "ambulancias_doctor_id_doctor_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_doctor" DROP CONSTRAINT "ambulancias_doctor_numero_placa_sm_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_hospitales" DROP CONSTRAINT "ambulancias_hospitales_id_hospitales_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_hospitales" DROP CONSTRAINT "ambulancias_hospitales_numero_placa_sm_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_paramedicos" DROP CONSTRAINT "ambulancias_paramedicos_id_paramedicos_fkey";

-- DropForeignKey
ALTER TABLE "ambulancias_paramedicos" DROP CONSTRAINT "ambulancias_paramedicos_numero_placa_sm_fkey";

-- DropIndex
DROP INDEX "hospitales_nombre_key";

-- CreateTable
CREATE TABLE "pacientes" (
    "id_paciente" SERIAL NOT NULL,
    "nombre" VARCHAR(255),
    "edad" INTEGER,
    "sexo" VARCHAR(1) NOT NULL,
    "descripcion_lesion" TEXT,
    "motivo_urgencia" VARCHAR(255) NOT NULL,
    "tipo_accidente" VARCHAR(255),
    "lugar" VARCHAR(255),
    "observaciones" TEXT,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "signos_vitales" (
    "id_signos" SERIAL NOT NULL,
    "frecuencia_cardiaca" VARCHAR(50),
    "frecuencia_respiratoria" VARCHAR(50),
    "tension_arterial" VARCHAR(50),
    "saturacion_oxigeno" VARCHAR(50),
    "temperatura" VARCHAR(50),
    "nivel_glucosa" VARCHAR(50),
    "estado_neurologico" VARCHAR(255),
    "paciente_id" INTEGER NOT NULL,

    CONSTRAINT "signos_vitales_pkey" PRIMARY KEY ("id_signos")
);

-- CreateTable
CREATE TABLE "tipo_lesion" (
    "id_lesion" SERIAL NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,

    CONSTRAINT "tipo_lesion_pkey" PRIMARY KEY ("id_lesion")
);

-- CreateTable
CREATE TABLE "pacientes_lesion" (
    "id_pacientes_lesion" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "lesion_id" INTEGER NOT NULL,

    CONSTRAINT "pacientes_lesion_pkey" PRIMARY KEY ("id_pacientes_lesion")
);

-- CreateTable
CREATE TABLE "ReportePrehospitalario" (
    "id_reporte" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_ambulancia" TEXT NOT NULL,
    "hora_estimada_llegada" TIMESTAMP(3),
    "ubicacion_actual" TEXT,
    "condicion_actual" TEXT,
    "codigo_prioridad" TEXT,
    "descripcion_escena" TEXT,
    "otros_hallazgos" TEXT,
    "instrucciones_hospital" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "id_signos" INTEGER,

    CONSTRAINT "ReportePrehospitalario_pkey" PRIMARY KEY ("id_reporte")
);

-- CreateTable
CREATE TABLE "Intervenciones" (
    "id_intervencion" SERIAL NOT NULL,
    "id_reporte" INTEGER NOT NULL,
    "tipo_intervencion" TEXT NOT NULL,
    "descripcion" TEXT,
    "hora_intervencion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervenciones_pkey" PRIMARY KEY ("id_intervencion")
);

-- CreateIndex
CREATE UNIQUE INDEX "signos_vitales_paciente_id_key" ON "signos_vitales"("paciente_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReportePrehospitalario_id_signos_key" ON "ReportePrehospitalario"("id_signos");

-- CreateIndex
CREATE UNIQUE INDEX "ambulancias_numero_placa_sm_key" ON "ambulancias"("numero_placa_sm");

-- CreateIndex
CREATE UNIQUE INDEX "ambulancias_paramedicos_id_ambulancias_paramedicos_key" ON "ambulancias_paramedicos"("id_ambulancias_paramedicos");

-- AddForeignKey
ALTER TABLE "ambulancias" ADD CONSTRAINT "ambulancias_id_hospitales_fkey" FOREIGN KEY ("id_hospitales") REFERENCES "hospitales"("id_hospitales") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias" ADD CONSTRAINT "ambulancias_id_paramedicos_fkey" FOREIGN KEY ("id_paramedicos") REFERENCES "paramedicos"("id_paramedicos") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_doctor" ADD CONSTRAINT "ambulancias_doctor_id_doctor_fkey" FOREIGN KEY ("id_doctor") REFERENCES "doctor"("id_doctor") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_doctor" ADD CONSTRAINT "ambulancias_doctor_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_hospitales" ADD CONSTRAINT "ambulancias_hospitales_id_hospitales_fkey" FOREIGN KEY ("id_hospitales") REFERENCES "hospitales"("id_hospitales") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_hospitales" ADD CONSTRAINT "ambulancias_hospitales_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_paramedicos" ADD CONSTRAINT "ambulancias_paramedicos_id_paramedicos_fkey" FOREIGN KEY ("id_paramedicos") REFERENCES "paramedicos"("id_paramedicos") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_paramedicos" ADD CONSTRAINT "ambulancias_paramedicos_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signos_vitales" ADD CONSTRAINT "signos_vitales_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id_paciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_lesion" ADD CONSTRAINT "pacientes_lesion_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id_paciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacientes_lesion" ADD CONSTRAINT "pacientes_lesion_lesion_id_fkey" FOREIGN KEY ("lesion_id") REFERENCES "tipo_lesion"("id_lesion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportePrehospitalario" ADD CONSTRAINT "ReportePrehospitalario_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "pacientes"("id_paciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportePrehospitalario" ADD CONSTRAINT "ReportePrehospitalario_id_ambulancia_fkey" FOREIGN KEY ("id_ambulancia") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportePrehospitalario" ADD CONSTRAINT "reporte_signos" FOREIGN KEY ("id_signos") REFERENCES "signos_vitales"("id_signos") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervenciones" ADD CONSTRAINT "Intervenciones_id_reporte_fkey" FOREIGN KEY ("id_reporte") REFERENCES "ReportePrehospitalario"("id_reporte") ON DELETE CASCADE ON UPDATE CASCADE;
