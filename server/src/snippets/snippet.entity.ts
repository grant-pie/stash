import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('snippets')
export class Snippet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  language: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: string[]): string =>
        Array.isArray(value) && value.length ? JSON.stringify(value) : '[]',
      from: (value: string | null): string[] => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
          // legacy simple-array format stored as CSV (e.g. "react,hooks")
          return value.split(',').filter(Boolean);
        }
      },
    },
  })
  tags: string[];

  @Column({ default: false })
  isPublic: boolean;

  @ManyToOne(() => User, (user) => user.snippets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
