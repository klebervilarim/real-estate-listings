
//renal.controller.js
app.controller('RentalsController', ['RentalService', function (RentalService) {
    var self = this;

    self.rentals = RentalService.rentals;
    self.rentalToUpdate = {};
    self.orderByColumn = 'city';
    self.editingMode = false;

    // Carregar lista inicial
    RentalService.getRentals();

    // Deletar um aluguel
    self.deleteRental = function (rentalId) {
        RentalService.deleteRental(rentalId);
    };

    // Entrar em modo de edição
    self.editRental = function (rental) {
        self.editingMode = true;
        self.rentalToUpdate = angular.copy(rental); // Faz uma cópia para evitar edição direta
        self.searchText = '';
    };

    // Atualizar um aluguel
    self.updateRental = function (id, city, rent, sqft) {
        self.currentRental = {
            rent: parseFloat(rent),
            sqft: parseInt(sqft),
            city: city
        };

        RentalService.updateRental(id, self.currentRental);
        self.editingMode = false;
    };

    // Cancelar edição
    self.cancelUpdate = function () {
        self.editingMode = false;
        RentalService.getRentals();
    };
}]);
