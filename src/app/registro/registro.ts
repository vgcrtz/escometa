import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { variables_globales } from '../variables-globales';
import { FormGroup, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro
{
  private http = inject(HttpClient);

  registerForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    nombre: new FormControl('', [Validators.required, Validators.minLength(10)]),
    nombre_usuario: new FormControl('', [Validators.required, Validators.minLength(5)]),
    contrasena: new FormControl('', [Validators.required, Validators.minLength(8)]),
    tipo_usuario: new FormControl('', [Validators.required])
  });

  registrarUsuario()
  {
     var ruta = `${variables_globales.server_url}auth/register.php`;

     console.log(this.registerForm.value);
     console.log(ruta);

     this.http.post(ruta, this.registerForm.value).subscribe({
       next: (respuesta) => console.log(respuesta),
       error: (error) => console.error(error)
     });
  }
}
