const databaseData = {
  doctor: {
    nombre: 'Juan',
    apellidos: 'Pérez',
    licencia_medica: 'LM123456',
    password: 'hashed_password_1'
  },
  hospitales: {
    nombre: 'Hospital General',
    direccion: 'Calle Principal 123',
    password: 'hashed_password_1'
  },
  operador: {
    nombre: 'Carlos',
    licencia_medica: 'LM987654',
    turno: 'diurno',
    password: 'hashed_password_1'
  },
  paramedico: {
    nombre: 'Ana',
    apellidos: 'López',
    licencia_medica: 'LM135791',
    certificado: 'Certificado A',
    licencia_conducir: 'LC12345',
    password: 'hashed_password_1'
  }
}

module.exports = databaseData
