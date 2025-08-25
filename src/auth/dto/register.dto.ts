import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDTO {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(3)
  displayName!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
