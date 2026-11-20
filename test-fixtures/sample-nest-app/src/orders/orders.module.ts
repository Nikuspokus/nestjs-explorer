import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';

@Module({
  imports: [UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService, { provide: 'ORDERS_REPO', useClass: OrdersRepository }],
})
export class OrdersModule {}
