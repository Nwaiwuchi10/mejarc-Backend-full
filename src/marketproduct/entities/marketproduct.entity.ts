import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Agent } from '../../agent/entities/agent.entity';
import { Rating } from './rating.entity';

export enum ProductCategory {
    BUILDING_PLAN = 'Building Plan',
    INTERIOR_DESIGN = 'Interior Design',
    LANDSCAPE_DESIGN = 'Landscape Design',
}

export enum PlanType {
    RESIDENTIAL = 'Residential',
    COMMERCIAL = 'Commercial',
    INDUSTRIAL = 'Industrial',
}

export enum FileTypeOption {
    PDF_ONLY = 'PDF only',
    CAD_PDF = 'CAD + PDF',
    THREE_D_CAD_PDF = '3D Model + CAD + PDF',
}

export enum MarketProductStatus {
    PENDING_REVIEW = 'pending_review',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('market_products')
export class MarketProduct {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column({
        type: 'enum',
        enum: ProductCategory,
        default: ProductCategory.BUILDING_PLAN,
    })
    category: ProductCategory;

    @Column({
        type: 'enum',
        enum: PlanType,
        default: PlanType.RESIDENTIAL,
    })
    planType: PlanType;

    @Column({ nullable: true })
    numBedrooms?: string; // e.g. "3-Bedroom"

    @Column({ nullable: true })
    numBathrooms?: string; // e.g. "3-Bathroom"

    @Column({ nullable: true })
    numFloors?: string; // e.g. "2"

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    price: number;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: FileTypeOption,
        default: FileTypeOption.PDF_ONLY,
    })
    fileType: FileTypeOption;

    @Column({ type: 'simple-array', nullable: true })
    drawingSet?: string[]; // e.g. ["Architectural Plan"]

    @Column({ type: 'simple-array', nullable: true })
    addOns?: string[]; // e.g. ["Construction Plans", "MEP Drawings"]

    // S3 URLs
    @Column({ type: 'simple-array', nullable: true })
    productImage?: string[];

    @Column({ type: 'simple-array', nullable: true })
    architecturalPlan?: string[];

    @Column({ type: 'simple-array', nullable: true })
    structuralPlan?: string[];

    status: MarketProductStatus;

    @OneToMany(() => Rating, (rating) => rating.product)
    ratings: Rating[];

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    averageRating: number;

    @Column({ type: 'int', default: 0 })
    ratingCount: number;

    @ManyToOne(() => Agent, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'agentId' })
    agent: Agent;

    @Column('uuid')
    agentId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
