-- CreateTable
CREATE TABLE "ambulancias" (
    "numero_placa_sm" SERIAL NOT NULL,
    "id_paramedicos" INTEGER,
    "id_hospitales" INTEGER,

    CONSTRAINT "ambulancias_pkey" PRIMARY KEY ("numero_placa_sm")
);

-- CreateTable
CREATE TABLE "ambulancias_doctor" (
    "id_doctor" INTEGER NOT NULL,
    "numero_placa_sm" INTEGER NOT NULL,
    "reporte_doctor" VARCHAR(255),

    CONSTRAINT "ambulancias_doctor_pkey" PRIMARY KEY ("id_doctor","numero_placa_sm")
);

-- CreateTable
CREATE TABLE "ambulancias_hospitales" (
    "id_hospitales" INTEGER NOT NULL,
    "numero_placa_sm" INTEGER NOT NULL,
    "reporte_servicio" VARCHAR(255),

    CONSTRAINT "ambulancias_hospitales_pkey" PRIMARY KEY ("id_hospitales","numero_placa_sm")
);

-- CreateTable
CREATE TABLE "ambulancias_paramedicos" (
    "id_ambulancias_paramedicos" SERIAL NOT NULL,
    "id_paramedicos" INTEGER,
    "numero_placa_sm" INTEGER,
    "reporte_inicial" VARCHAR(255),
    "fecha" TIMESTAMP(6),
    "estado" VARCHAR(50),

    CONSTRAINT "ambulancias_paramedicos_pkey" PRIMARY KEY ("id_ambulancias_paramedicos")
);

-- CreateTable
CREATE TABLE "doctor" (
    "id_doctor" SERIAL NOT NULL,
    "nombre" VARCHAR(255),
    "apellidos" VARCHAR(255),
    "licencia_medica" VARCHAR(255),
    "password" VARCHAR(50),

    CONSTRAINT "doctor_pkey" PRIMARY KEY ("id_doctor")
);

-- CreateTable
CREATE TABLE "hospitales" (
    "id_hospitales" SERIAL NOT NULL,
    "nombre" VARCHAR(255),
    "direccion" VARCHAR(255),
    "password" VARCHAR(50),

    CONSTRAINT "hospitales_pkey" PRIMARY KEY ("id_hospitales")
);

-- CreateTable
CREATE TABLE "operador" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50),
    "licencia_medica" VARCHAR(50),
    "password" VARCHAR(50),

    CONSTRAINT "operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paramedicos" (
    "id_paramedicos" SERIAL NOT NULL,
    "nombre" VARCHAR(255),
    "apellidos" VARCHAR(255),
    "licencia_medica" VARCHAR(255),
    "certificado" VARCHAR(255),
    "licencia_conducir" VARCHAR(255),
    "password" VARCHAR(50),

    CONSTRAINT "paramedicos_pkey" PRIMARY KEY ("id_paramedicos")
);

-- AddForeignKey
ALTER TABLE "ambulancias" ADD CONSTRAINT "ambulancias_id_hospitales_fkey" FOREIGN KEY ("id_hospitales") REFERENCES "hospitales"("id_hospitales") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias" ADD CONSTRAINT "ambulancias_id_paramedicos_fkey" FOREIGN KEY ("id_paramedicos") REFERENCES "paramedicos"("id_paramedicos") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_doctor" ADD CONSTRAINT "ambulancias_doctor_id_doctor_fkey" FOREIGN KEY ("id_doctor") REFERENCES "doctor"("id_doctor") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_doctor" ADD CONSTRAINT "ambulancias_doctor_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_hospitales" ADD CONSTRAINT "ambulancias_hospitales_id_hospitales_fkey" FOREIGN KEY ("id_hospitales") REFERENCES "hospitales"("id_hospitales") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_hospitales" ADD CONSTRAINT "ambulancias_hospitales_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_paramedicos" ADD CONSTRAINT "ambulancias_paramedicos_id_paramedicos_fkey" FOREIGN KEY ("id_paramedicos") REFERENCES "paramedicos"("id_paramedicos") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ambulancias_paramedicos" ADD CONSTRAINT "ambulancias_paramedicos_numero_placa_sm_fkey" FOREIGN KEY ("numero_placa_sm") REFERENCES "ambulancias"("numero_placa_sm") ON DELETE NO ACTION ON UPDATE NO ACTION;
