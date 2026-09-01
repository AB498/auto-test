<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    public const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];

    protected $fillable = ['reference', 'customer_id', 'status', 'total_cents', 'placed_at'];

    protected function casts(): array
    {
        return [
            'total_cents' => 'integer',
            'placed_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class);
    }

    public function getItemCountAttribute(): int
    {
        return (int) $this->items()->sum('quantity');
    }
}
