import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PAYSTACK_TRANSACTION_INI_URL } from './PaystackConstants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable() // Ensure this is present
export class PaystackService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService
  ) { }

  async initializePayment(
    userId: string | null,
    amount: number,
    redirect_url: string,
    email: string,
  ) {
    try {
      // let email: string;

      // Handle logged-in user
      if (userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
          throw new BadRequestException('User not found');
        }
        email = user.email;
      } else {
        // Handle guest user (no userId)
        if (!email) {
          throw new BadRequestException('Email is required for guest payments');
        }
        email = email;
      }

      //  Keep your existing metadata
      const metadata = {
        app_name: 'Mejarc',
        custom_fields: [
          {
            display_name: 'App Name',
            variable_name: 'app_name',
            value: 'Mejarc',
          },
          {
            display_name: 'App Name',
            variable_name: 'app_name',
            value: 'Mejarc',
          },
        ],
      };

      // Prepare payload safely
      const payload = {
        email, // use resolved email
        amount: Math.round(amount * 100), // Paystack expects amount in kobo
        currency: 'NGN',
        callback_url: redirect_url,
        metadata,
      };

      const headers = {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      };

      // Send request to Paystack
      const response = await axios.post(PAYSTACK_TRANSACTION_INI_URL, payload, {
        headers,
      });

      // Return successful result
      return {
        ...response.data,
        metadata, // include metadata for tracking
      };
    } catch (err) {
      console.error('Paystack error:', err.response?.data || err.message);
      throw new BadRequestException(
        err.response?.data?.message || 'Payment initialization failed',
      );
    }
  }

  async initializePayments(
    userId: string,
    grandTotal: number,
    redirect_url: string,
  ) {
    if (!this.configService) {
      throw new Error('ConfigService is not initialized');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException(`User with ID ${userId} not found`);
    const response = await axios.post(
      PAYSTACK_TRANSACTION_INI_URL,
      {
        email: user.email, // Replace with actual user email
        amount: grandTotal * 100, // Convert to kobo
        currency: 'NGN',
        callback_url: redirect_url,
      },
      {
        headers: {
          Authorization: `Bearer ${this.configService.get<string>('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Paystack Response:', response.data);

    if (!response.data.data.reference) {
      throw new BadRequestException(
        'Paystack failed to generate a payment reference.',
      );
    }
    return response.data;
  }
}
