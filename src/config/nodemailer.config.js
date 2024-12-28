import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER, // tu correo electrónico
        pass: process.env.EMAIL_PASS  // tu contraseña de correo
    }
});

export default transporter; 