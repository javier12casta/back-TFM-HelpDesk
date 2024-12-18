import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', // o el servicio que estés utilizando
    auth: {
        user: process.env.EMAIL_USER, // tu correo electrónico
        pass: process.env.EMAIL_PASS  // tu contraseña de correo
    }
});

export default transporter; 