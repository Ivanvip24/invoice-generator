// Function to generate unique invoice ID with date
function generateInvoiceID() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Format: VT-YYYYMMDD-HHMMSS (e.g., VT-20250929-143052)
    return `VT-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Product catalog with pricing information
const products = {
    'imanes_normal_chico': { name: 'Imanes Normales - Chicos' },
    'imanes_normal_grande': { name: 'Imanes Normales - Grandes' },
    'imanes_3d': { name: 'Imanes 3D' },
    'imanes_foil': { name: 'Imanes Foil Metálico' },
    'llaveros': { name: 'Llaveros (argolla reforzada)' },
    'destapadores': { name: 'Destapadores (doble remache, herraje completo, imán)' },
    'portallaves': { name: 'Portallaves (MDF 4.5mm)' }
};

// Function to calculate price based on quantity and tier data
function calculatePriceForQuantity(quantity, tiersJSON) {
    if (!quantity || quantity === 0) return 0;

    try {
        const tiers = JSON.parse(tiersJSON);
        for (let tier of tiers) {
            if (quantity >= tier.min && (!tier.max || quantity <= tier.max)) {
                return tier.price;
            }
        }
    } catch (e) {
        console.error('Error parsing tiers:', e);
    }
    return 0;
}

// Function to get tier description based on quantity
function getTierDescription(quantity, tiersJSON) {
    if (!quantity || quantity === 0) return '';

    try {
        const tiers = JSON.parse(tiersJSON);
        for (let tier of tiers) {
            if (quantity >= tier.min && (!tier.max || quantity <= tier.max)) {
                if (tier.max) {
                    return `${tier.min}-${tier.max} piezas`;
                } else {
                    return `${tier.min}+ piezas`;
                }
            }
        }
    } catch (e) {
        console.error('Error parsing tiers:', e);
    }
    return '';
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date automatically
    document.getElementById('invoiceDate').valueAsDate = new Date();

    // Dropdown functionality
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const isActive = this.classList.contains('active');

            // Toggle active class
            this.classList.toggle('active');
            content.classList.toggle('active');
        });
    });

    // Calculate totals on any input change
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Update price display for auto-price inputs
            if (this.classList.contains('auto-price')) {
                updatePriceDisplay(this);
            }
            calculateTotals();
        });
    });

    // Add listener for factura checkbox
    document.getElementById('requiresFactura').addEventListener('change', function() {
        calculateTotals();
        // Toggle factura billing info visibility
        const facturaInfoContainer = document.getElementById('facturaInfoContainer');
        if (this.checked) {
            facturaInfoContainer.style.display = 'block';
        } else {
            facturaInfoContainer.style.display = 'none';
        }
    });

    // Initial calculation
    calculateTotals();

    // Add event listeners to copy account buttons
    document.querySelectorAll('.copy-account-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const accountNumber = this.dataset.account;

            try {
                await navigator.clipboard.writeText(accountNumber);

                // Visual feedback
                const originalText = this.textContent;
                this.textContent = '✓';
                this.classList.add('copied');

                // Reset after 2 seconds
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Error copying to clipboard:', err);
                alert('No se pudo copiar al portapapeles');
            }
        });
    });

    // Generate PDF button
    document.getElementById('generatePDF').addEventListener('click', async function(e) {
        console.log('PDF button clicked!');
        e.preventDefault();

        try {
            const clientName = document.getElementById('clientName').value;
            const clientPhone = document.getElementById('clientPhone').value;
            const invoiceDate = document.getElementById('invoiceDate').value;
            const orderNotes = document.getElementById('orderNotes').value;

            console.log('Client:', clientName, 'Phone:', clientPhone, 'Date:', invoiceDate);

            if (!clientName) {
                alert('Por favor ingrese el nombre del cliente');
                return;
            }

            if (!clientPhone) {
                alert('Por favor ingrese el teléfono del cliente');
                return;
            }

            if (!invoiceDate) {
                alert('Por favor seleccione una fecha');
                return;
            }

            // Collect selected products
            const selectedProducts = [];
            const productInputs = document.querySelectorAll('.auto-price');

            productInputs.forEach(input => {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    const tiersData = input.dataset.tiers;
                    const unitPrice = calculatePriceForQuantity(quantity, tiersData);
                    const tierDesc = getTierDescription(quantity, tiersData);
                    const productInfo = products[input.id];

                    selectedProducts.push({
                        name: productInfo.name,
                        tier: tierDesc,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        total: quantity * unitPrice
                    });
                }
            });

            console.log('Selected products:', selectedProducts);

            if (selectedProducts.length === 0) {
                alert('Por favor seleccione al menos un producto');
                return;
            }

            // Calculate total quantity for delivery charge
            let totalQuantity = 0;
            selectedProducts.forEach(p => totalQuantity += p.quantity);

            // Calculate delivery charge
            let deliveryCharge = 0;
            let deliveryText = '';
            if (totalQuantity < 300 && totalQuantity > 0) {
                deliveryCharge = 210;
                deliveryText = `$${deliveryCharge.toFixed(2)} MXN`;
            } else if (totalQuantity >= 300) {
                deliveryCharge = 0;
                deliveryText = 'Gratis';
            }

            // Get totals
            const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, ''));
            const total = parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, ''));
            const depositAmount = parseFloat(document.getElementById('depositAmount').textContent.replace(/[^0-9.]/g, ''));

            // Check if factura/IVA is required
            const requiresFactura = document.getElementById('requiresFactura').checked;
            const ivaAmount = requiresFactura ? parseFloat(document.getElementById('ivaAmount').textContent.replace(/[^0-9.]/g, '')) : 0;

            // Generate unique invoice ID
            const invoiceID = generateInvoiceID();

            // Format date
            const dateObj = new Date(invoiceDate + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            console.log('About to generate PDF...');
            console.log('Invoice ID:', invoiceID);

            // Generate PDF
            await generatePDF(clientName, clientPhone, formattedDate, selectedProducts, subtotal, deliveryCharge, deliveryText, total, depositAmount, orderNotes, requiresFactura, ivaAmount, invoiceID);

            console.log('PDF generated successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            const errorMsg = error && error.message ? error.message : 'Error desconocido';
            alert('Error al generar el PDF: ' + errorMsg);
        }
    });

    // Generate Image button
    document.getElementById('generateImage').addEventListener('click', async function(e) {
        console.log('Image button clicked!');
        e.preventDefault();

        try {
            const clientName = document.getElementById('clientName').value;
            const clientPhone = document.getElementById('clientPhone').value;
            const invoiceDate = document.getElementById('invoiceDate').value;
            const orderNotes = document.getElementById('orderNotes').value;

            console.log('Client:', clientName, 'Phone:', clientPhone, 'Date:', invoiceDate);

            if (!clientName) {
                alert('Por favor ingrese el nombre del cliente');
                return;
            }

            if (!clientPhone) {
                alert('Por favor ingrese el teléfono del cliente');
                return;
            }

            if (!invoiceDate) {
                alert('Por favor seleccione una fecha');
                return;
            }

            // Collect selected products
            const selectedProducts = [];
            const productInputs = document.querySelectorAll('.auto-price');

            productInputs.forEach(input => {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    const tiersData = input.dataset.tiers;
                    const unitPrice = calculatePriceForQuantity(quantity, tiersData);
                    const tierDesc = getTierDescription(quantity, tiersData);
                    const productInfo = products[input.id];

                    selectedProducts.push({
                        name: productInfo.name,
                        tier: tierDesc,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        total: quantity * unitPrice
                    });
                }
            });

            console.log('Selected products:', selectedProducts);

            if (selectedProducts.length === 0) {
                alert('Por favor seleccione al menos un producto');
                return;
            }

            // Calculate total quantity for delivery charge
            let totalQuantity = 0;
            selectedProducts.forEach(p => totalQuantity += p.quantity);

            // Calculate delivery charge
            let deliveryCharge = 0;
            let deliveryText = '';
            if (totalQuantity < 300 && totalQuantity > 0) {
                deliveryCharge = 210;
                deliveryText = `$${deliveryCharge.toFixed(2)} MXN`;
            } else if (totalQuantity >= 300) {
                deliveryCharge = 0;
                deliveryText = 'Gratis';
            }

            // Get totals
            const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, ''));
            const total = parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, ''));
            const depositAmount = parseFloat(document.getElementById('depositAmount').textContent.replace(/[^0-9.]/g, ''));

            // Check if factura/IVA is required
            const requiresFactura = document.getElementById('requiresFactura').checked;
            const ivaAmount = requiresFactura ? parseFloat(document.getElementById('ivaAmount').textContent.replace(/[^0-9.]/g, '')) : 0;

            // Generate unique invoice ID
            const invoiceID = generateInvoiceID();

            // Format date
            const dateObj = new Date(invoiceDate + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            console.log('About to generate image...');
            console.log('Invoice ID:', invoiceID);

            // Generate Image
            await generateImage(clientName, clientPhone, formattedDate, selectedProducts, subtotal, deliveryCharge, deliveryText, total, depositAmount, orderNotes, requiresFactura, ivaAmount, invoiceID);

            console.log('Image generated successfully!');
        } catch (error) {
            console.error('Error generating image:', error);
            const errorMsg = error && error.message ? error.message : 'Error desconocido';
            alert('Error al generar la imagen: ' + errorMsg);
        }
    });

    // Copy Image to Clipboard button
    document.getElementById('copyImage').addEventListener('click', async function(e) {
        console.log('Copy image button clicked!');
        e.preventDefault();

        try {
            const clientName = document.getElementById('clientName').value;
            const clientPhone = document.getElementById('clientPhone').value;
            const invoiceDate = document.getElementById('invoiceDate').value;
            const orderNotes = document.getElementById('orderNotes').value;

            console.log('Client:', clientName, 'Phone:', clientPhone, 'Date:', invoiceDate);

            if (!clientName) {
                alert('Por favor ingrese el nombre del cliente');
                return;
            }

            if (!clientPhone) {
                alert('Por favor ingrese el teléfono del cliente');
                return;
            }

            if (!invoiceDate) {
                alert('Por favor seleccione una fecha');
                return;
            }

            // Collect selected products
            const selectedProducts = [];
            const productInputs = document.querySelectorAll('.auto-price');

            productInputs.forEach(input => {
                const quantity = parseInt(input.value) || 0;
                if (quantity > 0) {
                    const tiersData = input.dataset.tiers;
                    const unitPrice = calculatePriceForQuantity(quantity, tiersData);
                    const tierDesc = getTierDescription(quantity, tiersData);
                    const productInfo = products[input.id];

                    selectedProducts.push({
                        name: productInfo.name,
                        tier: tierDesc,
                        quantity: quantity,
                        unitPrice: unitPrice,
                        total: quantity * unitPrice
                    });
                }
            });

            console.log('Selected products:', selectedProducts);

            if (selectedProducts.length === 0) {
                alert('Por favor seleccione al menos un producto');
                return;
            }

            // Calculate total quantity for delivery charge
            let totalQuantity = 0;
            selectedProducts.forEach(p => totalQuantity += p.quantity);

            // Calculate delivery charge
            let deliveryCharge = 0;
            let deliveryText = '';
            if (totalQuantity < 300 && totalQuantity > 0) {
                deliveryCharge = 210;
                deliveryText = `$${deliveryCharge.toFixed(2)} MXN`;
            } else if (totalQuantity >= 300) {
                deliveryCharge = 0;
                deliveryText = 'Gratis';
            }

            // Get totals
            const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, ''));
            const total = parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, ''));
            const depositAmount = parseFloat(document.getElementById('depositAmount').textContent.replace(/[^0-9.]/g, ''));

            // Check if factura/IVA is required
            const requiresFactura = document.getElementById('requiresFactura').checked;
            const ivaAmount = requiresFactura ? parseFloat(document.getElementById('ivaAmount').textContent.replace(/[^0-9.]/g, '')) : 0;

            // Generate unique invoice ID
            const invoiceID = generateInvoiceID();

            // Format date
            const dateObj = new Date(invoiceDate + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            console.log('About to copy image to clipboard...');
            console.log('Invoice ID:', invoiceID);

            // Generate Image and copy to clipboard
            await generateImage(clientName, clientPhone, formattedDate, selectedProducts, subtotal, deliveryCharge, deliveryText, total, depositAmount, orderNotes, requiresFactura, ivaAmount, invoiceID, true);

            console.log('Image copied to clipboard successfully!');
        } catch (error) {
            console.error('Error copying image:', error);
            const errorMsg = error && error.message ? error.message : 'Error desconocido';
            alert('Error al copiar la imagen: ' + errorMsg);
        }
    });
});

// Function to update price display next to input
function updatePriceDisplay(input) {
    const quantity = parseInt(input.value) || 0;
    const tiersData = input.dataset.tiers;
    const priceDisplay = input.nextElementSibling;

    if (!priceDisplay || !priceDisplay.classList.contains('price-display')) return;

    if (quantity === 0) {
        priceDisplay.textContent = '';
        return;
    }

    const unitPrice = calculatePriceForQuantity(quantity, tiersData);
    const tierDesc = getTierDescription(quantity, tiersData);

    if (unitPrice > 0) {
        priceDisplay.textContent = `$${unitPrice.toFixed(2)} c/u (${tierDesc})`;
        priceDisplay.style.color = '#10b981';
        priceDisplay.style.fontWeight = '600';
        priceDisplay.style.fontSize = '0.85em';
    } else {
        priceDisplay.textContent = 'Cantidad mínima no alcanzada';
        priceDisplay.style.color = '#f59e0b';
        priceDisplay.style.fontWeight = '500';
        priceDisplay.style.fontSize = '0.85em';
    }
}

function calculateTotals() {
    let subtotal = 0;
    let totalQuantity = 0;

    // Calculate subtotal and total quantity from all product inputs with auto-price
    const productInputs = document.querySelectorAll('.auto-price');
    productInputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            totalQuantity += quantity;
            const tiersData = input.dataset.tiers;
            const unitPrice = calculatePriceForQuantity(quantity, tiersData);
            subtotal += quantity * unitPrice;
        }
    });

    // Calculate delivery charge
    let deliveryCharge = 0;
    const deliveryAmountSpan = document.getElementById('deliveryAmount');

    if (totalQuantity < 300 && totalQuantity > 0) {
        deliveryCharge = 210;
        deliveryAmountSpan.textContent = `$${deliveryCharge.toFixed(2)} MXN`;
        deliveryAmountSpan.style.color = '#2c3e50';
        deliveryAmountSpan.style.textDecoration = 'none';
    } else if (totalQuantity >= 300) {
        deliveryCharge = 0;
        deliveryAmountSpan.innerHTML = '<span style="text-decoration: line-through; color: #9ca3af;">$210.00 MXN</span> <span style="color: #10b981; font-weight: 700;">Gratis</span>';
    } else {
        deliveryAmountSpan.textContent = '$0.00 MXN';
        deliveryAmountSpan.style.color = '#2c3e50';
        deliveryAmountSpan.style.textDecoration = 'none';
    }

    // Check if factura is required
    const requiresFactura = document.getElementById('requiresFactura').checked;
    let ivaAmount = 0;
    let subtotalWithDelivery = subtotal + deliveryCharge;
    let total = subtotalWithDelivery;

    if (requiresFactura) {
        ivaAmount = subtotalWithDelivery * 0.16;
        total = subtotalWithDelivery + ivaAmount;
        document.getElementById('ivaRow').style.display = 'flex';
        document.getElementById('ivaAmount').textContent = `$${ivaAmount.toFixed(2)} MXN`;
    } else {
        document.getElementById('ivaRow').style.display = 'none';
    }

    // Calculate 50% deposit
    const depositAmount = total * 0.5;

    // Update display
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)} MXN`;
    document.getElementById('total').textContent = `$${total.toFixed(2)} MXN`;
    document.getElementById('depositAmount').textContent = `$${depositAmount.toFixed(2)} MXN`;
}

async function generatePDF(clientName, clientPhone, date, products, subtotal, deliveryCharge, deliveryText, total, depositAmount, notes, requiresFactura, ivaAmount, invoiceID) {
    console.log('generatePDF function called');

    if (!window.jspdf) {
        throw new Error('jsPDF library not loaded');
    }

    const { jsPDF } = window.jspdf;
    console.log('jsPDF loaded:', typeof jsPDF);

    const pdf = new jsPDF();
    console.log('PDF instance created');

    // Set light background color
    pdf.setFillColor(250, 252, 255);
    pdf.rect(0, 0, 210, 297, 'F');

    // Add company name as text instead of logo (to avoid CORS issues)
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text('VT Anunciando', 20, 25);

    // Title on right
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('RECIBO', 190, 22, { align: 'right' });

    // Invoice ID
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text(`ID: ${invoiceID}`, 190, 28, { align: 'right' });

    // Company info section
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(75, 85, 99);

    let infoY = 45;
    pdf.text('Fray Juan de Torquemada 146-Int 6', 20, infoY);
    pdf.text('Obrera, Cuauhtémoc', 20, infoY + 5);
    pdf.text('06800 Ciudad de México, CDMX', 20, infoY + 10);

    // Phone icon (simplified)
    pdf.setFontSize(8);
    pdf.text('☎', 20, infoY + 18);
    pdf.setFontSize(9);
    pdf.text('55 3825 3251', 26, infoY + 18);

    // Client and date info (right side)
    pdf.setFontSize(9);
    pdf.text(`Fecha: ${date}`, 190, infoY, { align: 'right' });
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(10);
    pdf.text(`Cliente:`, 190, infoY + 8, { align: 'right' });
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    pdf.text(clientName, 190, infoY + 13, { align: 'right' });
    pdf.text(`Tel: ${clientPhone}`, 190, infoY + 18, { align: 'right' });

    // Divider line
    pdf.setDrawColor(225, 228, 232);
    pdf.setLineWidth(0.5);
    pdf.line(20, 75, 190, 75);

    // Table header
    let yPos = 85;
    pdf.setFillColor(240, 241, 243);
    pdf.rect(20, yPos, 170, 8, 'F');

    pdf.setTextColor(44, 62, 80);
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.text('Descripción', 22, yPos + 5.5);
    pdf.text('Cant.', 120, yPos + 5.5);
    pdf.text('Precio Unit.', 140, yPos + 5.5);
    pdf.text('Total', 175, yPos + 5.5);

    // Table content
    pdf.setTextColor(75, 85, 99);
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8.5);
    yPos += 10;

    products.forEach((product, index) => {
        if (yPos > 250) {
            pdf.addPage();
            pdf.setFillColor(250, 252, 255);
            pdf.rect(0, 0, 210, 297, 'F');
            yPos = 20;
        }

        // Product description
        const fullDescription = `${product.name} (${product.tier})`;
        pdf.text(fullDescription, 22, yPos + 4, { maxWidth: 95 });

        // Quantity, unit price, and total
        pdf.text(product.quantity.toString(), 122, yPos + 4);
        pdf.text(`$${product.unitPrice.toFixed(2)}`, 143, yPos + 4);
        pdf.text(`$${product.total.toFixed(2)}`, 177, yPos + 4);

        // Row separator
        pdf.setDrawColor(240, 241, 243);
        pdf.setLineWidth(0.3);
        pdf.line(20, yPos + 7, 190, yPos + 7);

        yPos += 9;
    });

    // Totals section
    yPos += 5;

    // Calculate box height based on lines needed
    let boxHeight = 24; // Base height for subtotal + delivery + total
    if (requiresFactura) boxHeight += 6;

    // White box for totals
    pdf.setFillColor(255, 255, 255);
    pdf.rect(125, yPos, 65, boxHeight, 'F');
    pdf.setDrawColor(225, 228, 232);
    pdf.setLineWidth(0.5);
    pdf.rect(125, yPos, 65, boxHeight, 'S');

    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(75, 85, 99);

    let totalY = yPos + 6;
    pdf.text('Subtotal:', 130, totalY);
    pdf.text(`$${subtotal.toFixed(2)} MXN`, 185, totalY, { align: 'right' });

    // Add delivery charge
    totalY += 6;
    pdf.text('Envío:', 130, totalY);
    if (deliveryText === 'Gratis') {
        pdf.setTextColor(150, 150, 150);
        pdf.text('$210.00 MXN', 185, totalY, { align: 'right' });
        // Draw strikethrough
        const textWidth = pdf.getTextWidth('$210.00 MXN');
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.3);
        pdf.line(185 - textWidth, totalY - 1, 185, totalY - 1);
        // Add "Gratis" in green
        pdf.setTextColor(16, 185, 129);
        pdf.setFont(undefined, 'bold');
        pdf.text('Gratis', 185, totalY + 4, { align: 'right' });
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(75, 85, 99);
        totalY += 4;
    } else {
        pdf.text(deliveryText, 185, totalY, { align: 'right' });
    }

    // Add IVA if factura is required
    if (requiresFactura) {
        totalY += 6;
        pdf.text('IVA (16%):', 130, totalY);
        pdf.text(`$${ivaAmount.toFixed(2)} MXN`, 185, totalY, { align: 'right' });
    }

    // Total line
    totalY += 6;
    pdf.setDrawColor(225, 228, 232);
    pdf.setLineWidth(0.5);
    pdf.line(130, totalY - 2, 185, totalY - 2);

    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Total:', 130, totalY + 2);
    pdf.text(`$${total.toFixed(2)} MXN`, 185, totalY + 2, { align: 'right' });

    // Deposit amount (50%)
    totalY += 8;
    pdf.setFillColor(91, 108, 255);
    pdf.rect(125, totalY, 65, 12, 'F');
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Cantidad a depositar (50%):', 157.5, totalY + 4, { align: 'center' });
    pdf.setFontSize(11);
    pdf.text(`$${depositAmount.toFixed(2)} MXN`, 157.5, totalY + 9, { align: 'center' });

    // Reset colors
    pdf.setTextColor(75, 85, 99);
    pdf.setFont(undefined, 'normal');

    // Notes section (if provided)
    let bankingY = totalY + 20;
    if (notes && notes.trim()) {
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(44, 62, 80);
        pdf.text('Notas:', 20, bankingY);

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(75, 85, 99);
        const splitNotes = pdf.splitTextToSize(notes, 170);
        pdf.text(splitNotes, 20, bankingY + 6);
        bankingY += 6 + (splitNotes.length * 5) + 15;
    }

    // Banking Information Section
    // Check if we need a new page
    if (bankingY > 230) {
        pdf.addPage();
        pdf.setFillColor(250, 252, 255);
        pdf.rect(0, 0, 210, 297, 'F');
        bankingY = 20;
    }

    // Banking info title
    pdf.setFillColor(16, 185, 129);
    pdf.rect(20, bankingY, 170, 8, 'F');
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('MÉTODOS DE PAGO', 105, bankingY + 5.5, { align: 'center' });

    bankingY += 12;

    // Transferencia bancaria
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(6, 95, 70);
    pdf.text('TRANSFERENCIA BANCARIA', 20, bankingY);

    bankingY += 6;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(4, 120, 87);
    pdf.text('012 180 01571714055 4', 20, bankingY);

    bankingY += 5;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    pdf.text('BBVA', 20, bankingY);

    bankingY += 5;
    pdf.text('Iván Valencia', 20, bankingY);

    bankingY += 10;

    // Depósito en banco/cajero/Oxxo
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(6, 95, 70);
    pdf.text('DEPÓSITO EN BANCO/CAJERO/OXXO', 20, bankingY);

    bankingY += 6;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(4, 120, 87);
    pdf.text('4152 3138 4049 8567', 20, bankingY);

    bankingY += 5;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    pdf.text('BBVA', 20, bankingY);

    bankingY += 5;
    pdf.text('Iván Valencia', 20, bankingY);

    // Add factura info if required
    if (requiresFactura) {
        bankingY += 12;

        // Factura info title
        pdf.setFillColor(251, 191, 36);
        pdf.rect(20, bankingY, 170, 8, 'F');
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(146, 64, 14);
        pdf.text('DATOS PARA FACTURACIÓN', 105, bankingY + 5.5, { align: 'center' });

        bankingY += 12;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(75, 85, 99);
        pdf.text('Beneficiario: Alejandra Pérez Sierra', 20, bankingY);

        bankingY += 5;
        pdf.text('Clabe: 012180004835769653', 20, bankingY);

        bankingY += 5;
        pdf.text('Cuenta: 0483576965', 20, bankingY);
    }

    // Footer
    pdf.setTextColor(156, 163, 175);
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'italic');
    pdf.text('Gracias por su preferencia', 105, 280, { align: 'center' });

    // Save PDF with invoice ID in filename
    const fileName = `Factura_${invoiceID}_${clientName.replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
}

// Function to generate invoice as image
async function generateImage(clientName, clientPhone, date, products, subtotal, deliveryCharge, deliveryText, total, depositAmount, notes, requiresFactura, ivaAmount, invoiceID, copyToClipboard = false) {
    console.log('generateImage function called, copyToClipboard:', copyToClipboard);

    // Create a temporary canvas container
    const invoiceContainer = document.createElement('div');
    invoiceContainer.style.width = '800px';
    invoiceContainer.style.padding = '40px';
    invoiceContainer.style.backgroundColor = '#fafcff';
    invoiceContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    invoiceContainer.style.position = 'absolute';
    invoiceContainer.style.left = '-9999px';
    document.body.appendChild(invoiceContainer);

    // Build invoice HTML
    let invoiceHTML = `
        <div style="background: white; padding: 40px; border-radius: 8px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div>
                    <h1 style="font-size: 32px; color: #1e40af; margin: 0; font-weight: bold;">VT Anunciando</h1>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 20px; color: #2c3e50; margin: 0 0 5px 0; font-weight: bold;">RECIBO</h2>
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">ID: ${invoiceID}</p>
                </div>
            </div>

            <!-- Company & Client Info -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
                <div style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                    <p style="margin: 0;">Fray Juan de Torquemada 146-Int 6</p>
                    <p style="margin: 0;">Obrera, Cuauhtémoc</p>
                    <p style="margin: 0;">06800 Ciudad de México, CDMX</p>
                    <p style="margin: 5px 0 0 0;">☎ 55 3825 3251</p>
                </div>
                <div style="text-align: right; font-size: 13px; color: #4b5563;">
                    <p style="margin: 0;">Fecha: ${date}</p>
                    <p style="margin: 5px 0 0 0; font-weight: 600; color: #2c3e50;">Cliente: ${clientName}</p>
                    <p style="margin: 5px 0 0 0;">Tel: ${clientPhone}</p>
                </div>
            </div>

            <!-- Products Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e5e7eb;">Descripción</th>
                        <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e5e7eb;">Cant.</th>
                        <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e5e7eb;">P. Unit.</th>
                        <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #e5e7eb;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    products.forEach((product, index) => {
        const bgColor = index % 2 === 0 ? '#fafbfc' : '#ffffff';
        invoiceHTML += `
            <tr style="background: ${bgColor};">
                <td style="padding: 10px; font-size: 12px; color: #4b5563; border-bottom: 1px solid #f0f1f3;">${product.name} (${product.tier})</td>
                <td style="padding: 10px; font-size: 12px; color: #4b5563; text-align: center; border-bottom: 1px solid #f0f1f3;">${product.quantity}</td>
                <td style="padding: 10px; font-size: 12px; color: #4b5563; text-align: right; border-bottom: 1px solid #f0f1f3;">$${product.unitPrice.toFixed(2)}</td>
                <td style="padding: 10px; font-size: 12px; color: #4b5563; text-align: right; border-bottom: 1px solid #f0f1f3;">$${product.total.toFixed(2)}</td>
            </tr>
        `;
    });

    invoiceHTML += `
                </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                <div style="width: 300px; background: #fafbfc; padding: 20px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #4b5563;">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)} MXN</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #4b5563;">
                        <span>Envío:</span>
                        <span>${deliveryText === 'Gratis' ? '<span style="text-decoration: line-through; color: #9ca3af;">$210.00 MXN</span> <span style="color: #10b981; font-weight: 700;">Gratis</span>' : deliveryText}</span>
                    </div>
    `;

    if (requiresFactura) {
        invoiceHTML += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #4b5563;">
                        <span>IVA (16%):</span>
                        <span>$${ivaAmount.toFixed(2)} MXN</span>
                    </div>
        `;
    }

    invoiceHTML += `
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 10px; border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: bold; color: #2c3e50;">
                        <span>Total:</span>
                        <span>$${total.toFixed(2)} MXN</span>
                    </div>
                    <div style="margin-top: 12px; padding: 12px; background: #5b6cff; border-radius: 6px; font-weight: bold; color: white; text-align: center;">
                        <div style="font-size: 13px; margin-bottom: 5px;">Cantidad a depositar (50%):</div>
                        <div style="font-size: 17px;">$${depositAmount.toFixed(2)} MXN</div>
                    </div>
                </div>
            </div>
    `;

    if (notes && notes.trim()) {
        invoiceHTML += `
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px;">
                <p style="font-weight: 600; color: #2c3e50; margin: 0 0 8px 0; font-size: 13px;">Notas:</p>
                <p style="font-size: 12px; color: #4b5563; margin: 0; line-height: 1.5;">${notes}</p>
            </div>
        `;
    }

    // Banking Information Section
    invoiceHTML += `
        <div style="margin-top: 25px; border: 2px solid #10b981; border-radius: 8px; overflow: hidden;">
            <div style="background: #d1fae5; padding: 12px; border-bottom: 2px solid #10b981;">
                <h3 style="margin: 0; font-size: 14px; color: #065f46; font-weight: 700; text-align: center; text-transform: uppercase;">💳 MÉTODOS DE PAGO</h3>
            </div>
            <div style="padding: 20px; background: #f0fdf4; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="padding: 15px; background: white; border-radius: 6px; border: 1px solid #86efac;">
                    <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #065f46; font-weight: 700; text-transform: uppercase;">TRANSFERENCIA BANCARIA</h4>
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #047857; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">012 180 01571714055 4</p>
                    <p style="margin: 3px 0; font-size: 12px; color: #065f46; font-weight: 600;">BBVA</p>
                    <p style="margin: 3px 0; font-size: 12px; color: #065f46; font-weight: 600;">Iván Valencia</p>
                </div>
                <div style="padding: 15px; background: white; border-radius: 6px; border: 1px solid #86efac;">
                    <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #065f46; font-weight: 700; text-transform: uppercase;">DEPÓSITO EN BANCO/CAJERO/OXXO</h4>
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #047857; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 1px;">4152 3138 4049 8567</p>
                    <p style="margin: 3px 0; font-size: 12px; color: #065f46; font-weight: 600;">BBVA</p>
                    <p style="margin: 3px 0; font-size: 12px; color: #065f46; font-weight: 600;">Iván Valencia</p>
                </div>
            </div>
        </div>
    `;

    // Add factura billing info if required
    if (requiresFactura) {
        invoiceHTML += `
            <div style="margin-top: 15px; border: 2px solid #fbbf24; border-radius: 8px; overflow: hidden;">
                <div style="background: #fef3c7; padding: 12px; border-bottom: 1px solid #fbbf24;">
                    <h3 style="margin: 0; font-size: 13px; color: #92400e; font-weight: 700; text-align: center;">📄 DATOS PARA FACTURACIÓN</h3>
                </div>
                <div style="padding: 15px; background: white;">
                    <p style="margin: 5px 0; font-size: 12px; color: #4b5563;"><strong style="color: #2c3e50;">Beneficiario:</strong> Alejandra Pérez Sierra</p>
                    <p style="margin: 5px 0; font-size: 12px; color: #4b5563;"><strong style="color: #2c3e50;">Clabe:</strong> 012180004835769653</p>
                    <p style="margin: 5px 0; font-size: 12px; color: #4b5563;"><strong style="color: #2c3e50;">Cuenta:</strong> 0483576965</p>
                </div>
            </div>
        `;
    }

    invoiceHTML += `
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9ca3af; font-style: italic;">
                Gracias por su preferencia
            </div>
        </div>
    `;

    invoiceContainer.innerHTML = invoiceHTML;

    // Use html2canvas to convert to image
    const canvas = await html2canvas(invoiceContainer, {
        scale: 2,
        backgroundColor: '#fafcff',
        logging: false
    });

    // Remove temporary container
    document.body.removeChild(invoiceContainer);

    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    if (copyToClipboard) {
        // Check if we're on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // On mobile: download the image so user can share from gallery
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Recibo_${invoiceID}_${clientName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert('✅ Imagen guardada. Puedes encontrarla en tu galería y compartirla por WhatsApp.');
        } else {
            // On desktop: try to copy to clipboard
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                alert('✅ Imagen copiada al portapapeles. Puedes pegarla donde necesites.');
            } catch (err) {
                console.error('Error copying to clipboard:', err);
                // Fallback to download
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Recibo_${invoiceID}_${clientName.replace(/\s+/g, '_')}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert('✅ Imagen descargada. Puedes compartirla desde tu carpeta de descargas.');
            }
        }
    } else {
        // Normal download mode (for "Recibo Imagen" button)
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Recibo_${invoiceID}_${clientName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('✅ Imagen descargada exitosamente.');
    }
}

