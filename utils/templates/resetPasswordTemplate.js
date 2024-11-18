
// resetPasswordTemplate.js

export function resetPasswordTemplate(userId) {

    console.log("frontend url is ",process.env.frontend_url)

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #6D28D9, #A855F7);
                margin: 0; 
                padding: 2rem; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh;
                color: #333;
            }
            .container { 
                max-width: 600px; 
                background-color: white; 
                padding: 2rem; 
                border-radius: 10px; 
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); 
                text-align: center;
                border: 2px solid #8A4AF3;
            }
            .header { 
                margin-bottom: 2rem; 
                color: #8A4AF3;
            }
            .header h1 { 
                font-size: 2.5rem; 
                margin: 0;
            }
            .header p { 
                font-size: 1.2rem; 
                margin-top: 0.5rem; 
                color: #666;
            }
            .content { 
                margin-bottom: 2rem; 
            }
            .content h2 { 
                font-size: 1.8rem; 
                margin-bottom: 1rem; 
                color: #333;
            }
            .content p { 
                font-size: 1.2rem; 
                color: #555; 
                margin-bottom: 1.5rem;
            }
            .button-container { 
                margin-top: 2rem; 
            }
            .button { 
                display: inline-block; 
                background-color: #8A4AF3;
                color: white; 
                padding: 12px 24px; 
                border-radius: 5px; 
                text-decoration: none; 
                font-size: 1.2rem; 
            }
            .button:hover { 
                background-color: #7b3de3;
            }
            .footer { 
                margin-top: 2rem; 
                font-size: 0.9rem; 
                color: #777; 
                text-align: center;
            }
            .footer p { 
                margin: 0.5rem 0;
            }
            a { 
                color: #8A4AF3;
                text-decoration: none; 
            }
            a:hover { 
                text-decoration: underline; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Reset Your Password</h1>
                <p>Talent ID - Empowering Your Future</p>
            </div>
  
            <div class="content">
                <h2>Hi there,</h2>
                <p>We received a request to reset your Talent ID account password. Click the button below to reset your password:</p>
                <div class="button-container">
                    <a href=${process.env.frontend_url}/auth/forgot-password/${userId} class="button">Reset Password</a>
                </div>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
  
            <div class="footer">
                <p>Thank you for using Talent ID.</p>
                <p>If you need help, feel free to <a href="mailto:support@talentid.com">contact our support team</a>.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
  