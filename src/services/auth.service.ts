import * as db from '../db';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

export interface User {
    id: number;
    username: string;
    email: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export interface UserInput {
    username: string;
    email: string;
    password: string;
    name: string;
}

export class AuthService {
    private saltRounds = 10;

    async register(userInput: UserInput): Promise<User> {
        const { username, email, password, name } = userInput;
        
        // Check if user already exists (either username or email)
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, this.saltRounds);

        // Insert new user
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash, name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, name, created_at, updated_at',
            [username, email, passwordHash, name]
        );

        return result.rows[0];
    }

    async login(usernameOrEmail: string, password: string): Promise<User> {
        // Get user by username or email
        const result = await db.query(
            'SELECT id, username, email, name, password_hash, created_at, updated_at FROM users WHERE username = $1 OR email = $1',
            [usernameOrEmail]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        // Don't return the password hash
        delete user.password_hash;
        return user;
    }
} 