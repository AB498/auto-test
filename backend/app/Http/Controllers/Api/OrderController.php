<?php

namespace App\Http\Controllers\Api;

use App\Actions\PlaceOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', 'in:'.implode(',', Order::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $orders = Order::query()
            ->when($request->input('status'), fn ($query, $status) => $query->where('status', $status))
            ->when($request->input('search'), fn ($query, $search) => $query
                ->where('reference', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($customer) => $customer->where('name', 'like', "%{$search}%")))
            ->latest('placed_at')
            ->paginate($request->integer('per_page', 15));

        return OrderResource::collection($orders);
    }

    public function show(Order $order)
    {
        return new OrderResource($order->load('customer', 'items.product'));
    }

    public function store(StoreOrderRequest $request, PlaceOrder $placeOrder)
    {
        $order = $placeOrder->handle(
            Customer::findOrFail($request->integer('customer_id')),
            $request->validated('items'),
        );

        return (new OrderResource($order))->response()->setStatusCode(201);
    }
}
