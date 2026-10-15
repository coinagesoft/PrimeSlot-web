import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '194.59.164.112',
  port: 3306,
  user: 'u856729253_coinprime',
  password: 'myfsu2-pokqef-kunpiF',
  database: 'u856729253_primeslot',
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 0, 
}); 



export default pool;