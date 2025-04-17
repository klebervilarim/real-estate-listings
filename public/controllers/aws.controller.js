app.controller('AwsController', function($scope, $http) {
  $scope.awsServices = [];
  $scope.selectedService = '';
  $scope.serviceData = [];
  $scope.awsStatus = 'Verificando conexão...';
  $scope.lambdaCode = '';
  $scope.selectedLambdaName = '';

  // Verifica conexão AWS
  $http.get('/api/aws/status').then(res => {
    $scope.awsStatus = res.data.status === 'conectado'
      ? '✅ AWS Conectada'
      : '❌ AWS Não conectada';
  }).catch(() => {
    $scope.awsStatus = '❌ AWS Não conectada';
  });

  // Carrega lista de serviços AWS
  $http.get('/api/list-services').then(res => {
    $scope.awsServices = res.data;
  }).catch(() => {
    $scope.awsServices = [];
  });

  // Carrega dados do serviço selecionado
  $scope.loadServiceData = function () {
    if (!$scope.selectedService) return;
    $scope.lambdaCode = ''; // Limpa o código ao trocar o serviço
    $scope.selectedLambdaName = '';
    $http.get('/api/aws/' + $scope.selectedService).then(res => {
      $scope.serviceData = res.data;
    });
  };

  // Desliga instância EC2
  $scope.stopInstance = function (instanceId) {
    if (!confirm('Deseja desligar a instância ' + instanceId + '?')) return;
    $http.post('/api/ec2/stop', { instanceId }).then(res => {
      alert(res.data.message);
      $scope.loadServiceData();
    });
  };

  // Visualiza código da função Lambda
  $scope.viewLambdaCode = function (functionName) {
    $scope.selectedLambdaName = functionName;
    $http.get('/api/lambda/' + functionName).then(res => {
      $scope.lambdaCode = res.data.code || 'Sem conteúdo';
    }).catch(() => {
      $scope.lambdaCode = 'Erro ao carregar código da função Lambda.';
    });
  };
});
