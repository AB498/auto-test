<?php

namespace App\Actions;

use App\Exceptions\InsufficientStockException;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\Product;

class PlaceOrder
{
    /**
     * @param  array<int, array{product_id: int, quantity: int}>  $lines
     */
    public function handle(Customer $customer, array $lines): Order
    {
        $products = Product::whereIn('id', array_column($lines, 'product_id'))
            ->get()
            ->keyBy('id');

        $order = Order::create([
            'reference' => $this->nextReference(),
            'customer_id' => $customer->id,
            'status' => 'pending',
            'placed_at' => now(),
        ]);

        $total = 0;

        foreach ($lines as $line) {
            $product = $products[$line['product_id']];

            if ($product->stock < $line['quantity']) {
                throw new InsufficientStockException($product, $line['quantity']);
            }

            $product->stock -= $line['quantity'];
            $product->save();

            $order->items()->create([
                'product_id' => $product->id,
                'quantity' => $line['quantity'],
                'unit_price_cents' => $product->price_cents,
            ]);

            $total += $product->price_cents * $line['quantity'];
        }

        $order->update(['total_cents' => $total]);

        // The warehouse sync job tails this table, so every placed order must have one.
        OrderEvent::create([
            'order_id' => $order->id,
            'type' => 'order.placed',
            'payload' => ['total_cents' => $total, 'lines' => count($lines)],
        ]);

        return $order;
    }

    private function nextReference(): string
    {
        return 'ORD-'.str_pad((string) ((int) Order::max('id') + 1), 6, '0', STR_PAD_LEFT);
    }
}
